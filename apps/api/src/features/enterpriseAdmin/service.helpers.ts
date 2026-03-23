import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import type { EnterpriseUser, EnterpriseUserRole, ParsedModulePayload } from "./types.js";

const MODULE_NAME_MAX_LENGTH = 120;
const MODULE_CODE_MAX_LENGTH = 32;
const MODULE_SECTION_MAX_LENGTH = 8_000;

export function parseModulePayload(body: unknown): { ok: true; value: ParsedModulePayload } | { ok: false; error: string } {
  const name = typeof (body as any)?.name === "string" ? (body as any).name.trim() : "";
  if (!name) return { ok: false, error: "Module name is required" };
  if (name.length > MODULE_NAME_MAX_LENGTH) {
    return { ok: false, error: `Module name must be ${MODULE_NAME_MAX_LENGTH} characters or fewer` };
  }

  const code = parseOptionalModuleCodeField((body as any)?.code);
  if (!code.ok) return { ok: false, error: code.error };

  const briefText = parseOptionalTextField((body as any)?.briefText, "Module brief");
  if (!briefText.ok) return { ok: false, error: briefText.error };

  const timelineText = parseOptionalTextField((body as any)?.timelineText, "Timeline");
  if (!timelineText.ok) return { ok: false, error: timelineText.error };

  const expectationsText = parseOptionalTextField((body as any)?.expectationsText, "Module expectations");
  if (!expectationsText.ok) return { ok: false, error: expectationsText.error };

  const readinessNotesText = parseOptionalTextField((body as any)?.readinessNotesText, "Readiness notes");
  if (!readinessNotesText.ok) return { ok: false, error: readinessNotesText.error };

  const leaderIds = parsePositiveIntArray((body as any)?.leaderIds ?? [], "leaderIds");
  if (!leaderIds.ok) return { ok: false, error: leaderIds.error };

  const taIds = parsePositiveIntArray((body as any)?.taIds ?? [], "taIds");
  if (!taIds.ok) return { ok: false, error: taIds.error };

  const studentIds = parsePositiveIntArray((body as any)?.studentIds ?? [], "studentIds");
  if (!studentIds.ok) return { ok: false, error: studentIds.error };

  return {
    ok: true,
    value: {
      name,
      code: code.value,
      briefText: briefText.value,
      timelineText: timelineText.value,
      expectationsText: expectationsText.value,
      readinessNotesText: readinessNotesText.value,
      leaderIds: leaderIds.value,
      taIds: taIds.value,
      studentIds: studentIds.value,
    },
  };
}

export function ensureCreatorLeader(leaderIds: number[], user: EnterpriseUser): number[] {
  if (leaderIds.includes(user.id)) return leaderIds;
  return [...leaderIds, user.id];
}

export function isEnterpriseAdminRole(role: EnterpriseUserRole): role is Extract<EnterpriseUserRole, "ENTERPRISE_ADMIN" | "ADMIN"> {
  return role === "ENTERPRISE_ADMIN" || role === "ADMIN";
}

export function parsePositiveInt(value: string | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function parsePositiveIntArray(
  value: unknown,
  field: string,
): { ok: true; value: number[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: `${field} must be an array` };

  const unique: number[] = [];
  const seen = new Set<number>();
  for (const entry of value) {
    const parsed = Number(entry);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: `${field} must contain positive integers` };
    }
    if (seen.has(parsed)) continue;
    seen.add(parsed);
    unique.push(parsed);
  }

  return { ok: true, value: unique };
}

export function getUtcStartOfDaysAgo(days: number): Date {
  const now = new Date();
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(utcMidnight - days * 24 * 60 * 60 * 1000);
}

export function normalizeFeatureFlagLabel<T extends { key: string; label: string }>(flag: T): T {
  if (flag.key === "repos" && flag.label === "Repos") {
    return { ...flag, label: "Repositories" };
  }
  return flag;
}

export async function validateAssignmentUsers(input: {
  enterpriseId: string;
  leaderIds: number[];
  taIds: number[];
  studentIds: number[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const requestedIds = [...new Set([...input.leaderIds, ...input.taIds, ...input.studentIds])];
  if (requestedIds.length === 0) return { ok: true };

  const users = await prisma.user.findMany({
    where: {
      enterpriseId: input.enterpriseId,
      id: { in: requestedIds },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (users.length !== requestedIds.length) {
    return { ok: false, error: "Some selected users do not belong to this enterprise" };
  }

  const roleById = new Map(users.map((user) => [user.id, user.role]));

  for (const id of input.leaderIds) {
    const role = roleById.get(id);
    if (role !== "STAFF" && role !== "ENTERPRISE_ADMIN" && role !== "ADMIN") {
      return { ok: false, error: "Module leaders must be staff or admin accounts" };
    }
  }

  for (const id of input.taIds) {
    if (!roleById.has(id)) {
      return { ok: false, error: "Some selected users do not belong to this enterprise" };
    }
  }

  for (const id of input.studentIds) {
    const role = roleById.get(id);
    if (role !== "STUDENT") {
      return { ok: false, error: "Student assignments can only include student accounts" };
    }
  }

  return { ok: true };
}

export async function replaceModuleAssignments(
  tx: Prisma.TransactionClient,
  input: {
    enterpriseId: string;
    moduleId: number;
    leaderIds: number[];
    taIds: number[];
    studentIds: number[];
  },
) {
  await tx.moduleLead.deleteMany({ where: { moduleId: input.moduleId } });
  await tx.moduleTeachingAssistant.deleteMany({ where: { moduleId: input.moduleId } });
  await tx.userModule.deleteMany({ where: { enterpriseId: input.enterpriseId, moduleId: input.moduleId } });

  if (input.leaderIds.length > 0) {
    await tx.moduleLead.createMany({
      data: input.leaderIds.map((userId) => ({ moduleId: input.moduleId, userId })),
      skipDuplicates: true,
    });
  }

  if (input.taIds.length > 0) {
    await tx.moduleTeachingAssistant.createMany({
      data: input.taIds.map((userId) => ({ moduleId: input.moduleId, userId })),
      skipDuplicates: true,
    });
  }

  if (input.studentIds.length > 0) {
    await tx.userModule.createMany({
      data: input.studentIds.map((userId) => ({
        enterpriseId: input.enterpriseId,
        moduleId: input.moduleId,
        userId,
      })),
      skipDuplicates: true,
    });
  }
}

function parseOptionalModuleCodeField(
  value: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: "Module code must be a string" };

  const normalized = value.trim().toUpperCase();
  if (!normalized) return { ok: true, value: null };
  if (normalized.length > MODULE_CODE_MAX_LENGTH) {
    return { ok: false, error: `Module code must be ${MODULE_CODE_MAX_LENGTH} characters or fewer` };
  }

  return { ok: true, value: normalized };
}

function parseOptionalTextField(
  value: unknown,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${label} must be a string` };

  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > MODULE_SECTION_MAX_LENGTH) {
    return { ok: false, error: `${label} must be ${MODULE_SECTION_MAX_LENGTH} characters or fewer` };
  }

  return { ok: true, value: trimmed };
}
