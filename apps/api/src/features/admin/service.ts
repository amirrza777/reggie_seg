import { listAuditLogs, recordAuditLog } from "../audit/service.js";
import { EnterpriseCodeGeneratorService } from "../services/enterprise/enterpriseCodeGeneratorService.js";
import { randomBytes, createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import {
  buildAdminEnterpriseSearchWhere,
  matchesAdminEnterpriseFuzzyCandidate,
  matchesAdminEnterpriseSearchCandidate,
  type AdminEnterpriseSearchFilters,
} from "./enterpriseSearch.js";
import {
  buildAdminUserSearchOrderBy,
  buildAdminUserSearchWhere,
  matchesAdminUserSearchCandidate,
  type AdminUserSearchFilters,
} from "./userSearch.js";
import * as repo from "./repo.js";
import type { EnterpriseFlagSeed, UserRole } from "./types.js";
import {
  DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES,
  fuzzyFilterAndPaginate,
  shouldUseFuzzyFallback,
} from "../../shared/fuzzyFallback.js";
import { ENTERPRISE_FEATURE_FLAG_DEFAULTS } from "../featureFlags/defaults.js";
import { sendEmail } from "../../shared/email.js";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "admin@kcl.ac.uk").toLowerCase();
const REMOVED_USERS_ENTERPRISE_CODE = (process.env.REMOVED_USERS_ENTERPRISE_CODE ?? "UNASSIGNED").toUpperCase();
const ENTERPRISE_CODE_REGEX = /^[A-Z0-9]{3,16}$/;
const ENTERPRISE_INVITE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENTERPRISE_CREATE_MAX_CODE_GENERATION_ATTEMPTS = 5;
const ENTERPRISE_ADMIN_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const enterpriseCodeGenerator = new EnterpriseCodeGeneratorService();
const defaultEnterpriseFeatureFlags: EnterpriseFlagSeed[] = [...ENTERPRISE_FEATURE_FLAG_DEFAULTS];
type AdminActor = { id?: number; enterpriseId?: string; email?: string } | undefined;

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isPrismaUniqueConstraintError(err: unknown): err is { code: string; meta?: { target?: unknown } } {
  return Boolean(err && typeof err === "object" && (err as { code?: unknown }).code === "P2002");
}

function isEnterpriseCodeUniqueConstraintError(err: unknown): boolean {
  if (!isPrismaUniqueConstraintError(err)) {
    return false;
  }
  const target = err.meta?.target;
  if (!Array.isArray(target)) {
    return true;
  }
  return target.some((item) => typeof item === "string" && item.toLowerCase() === "code");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function resolveAdminUser(payload: { sub?: number; admin?: boolean }) {
  if (!payload?.sub || !payload.admin) return null;
  const user = await repo.findAdminUserById(payload.sub);
  if (!user || user.role !== "ADMIN" || user.active === false) return null;
  return user;
}

export function isSuperAdminEmail(email: string) {
  return email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function isRole(value: unknown): value is UserRole {
  return value === "STUDENT" || value === "STAFF" || value === "ADMIN" || value === "ENTERPRISE_ADMIN";
}

function isSuperAdminActor(actor: AdminActor): boolean {
  return Boolean(actor?.email && isSuperAdminEmail(actor.email));
}

function resolveManagedScopeEnterpriseId(actor: AdminActor): string | null {
  if (!actor) {
    return null;
  }
  if (isSuperAdminActor(actor)) {
    return null;
  }
  return actor.enterpriseId ?? null;
}

function canManageTargetUser(actor: AdminActor, targetEnterpriseId: string): boolean {
  const scopeEnterpriseId = resolveManagedScopeEnterpriseId(actor);
  if (!scopeEnterpriseId) {
    return true;
  }
  return targetEnterpriseId === scopeEnterpriseId;
}

export async function getSummary(enterpriseId: string) {
  const [users, modules, teams, meetings] = await Promise.all([
    repo.countEnterpriseUsers(enterpriseId),
    repo.countEnterpriseModules(enterpriseId),
    repo.countEnterpriseTeams(enterpriseId),
    repo.countEnterpriseMeetings(enterpriseId),
  ]);
  return { users, modules, teams, meetings };
}

export async function listUsers(actor?: { enterpriseId?: string; email?: string }) {
  const scopeEnterpriseId = resolveManagedScopeEnterpriseId(actor);
  const records = scopeEnterpriseId
    ? await repo.listUsersByEnterprise(scopeEnterpriseId)
    : await repo.listUsers();
  return records.map(toAdminUserPayload);
}

async function searchUsersWithScope(filters: AdminUserSearchFilters, enterpriseId: string | null) {
  const where = buildAdminUserSearchWhere({
    enterpriseId,
    query: filters.query,
    role: filters.role,
    active: filters.active,
  });
  const orderBy = buildAdminUserSearchOrderBy(filters);
  const [total, records] = await Promise.all([
    repo.countUsersByWhere(where),
    repo.listUsersByWhere(where, filters.page, filters.pageSize, orderBy),
  ]);
  const strictResponse = toAdminUserSearchResponse(records, filters, total);
  if (!shouldUseFuzzyFallback(total, filters.query)) {
    return strictResponse;
  }

  const fuzzyBaseWhere = buildAdminUserSearchWhere({
    enterpriseId,
    query: null,
    role: filters.role,
    active: filters.active,
  });
  const candidateTotal = await repo.countUsersByWhere(fuzzyBaseWhere);
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) {
    return strictResponse;
  }

  const candidates = await repo.listUsersByWhere(fuzzyBaseWhere, 1, candidateTotal);
  const fuzzyPage = fuzzyFilterAndPaginate(candidates, {
    query: filters.query,
    pagination: filters,
    matches: matchesAdminUserSearchCandidate,
  });
  return toAdminUserSearchResponse(fuzzyPage.items, filters, fuzzyPage.total);
}

export async function searchUsers(filters: AdminUserSearchFilters, actor?: { enterpriseId?: string; email?: string }) {
  return searchUsersWithScope(filters, resolveManagedScopeEnterpriseId(actor));
}

export async function updateOwnEnterpriseUserRole(id: number, role: UserRole, actor?: { id?: number; enterpriseId?: string; email?: string }) {
  if (role === "ENTERPRISE_ADMIN") {
    return { ok: false as const, status: 400, error: "Role not assignable" };
  }
  if (role === "ADMIN" && !isSuperAdminActor(actor)) {
    return { ok: false as const, status: 403, error: "Role not assignable" };
  }
  const user = await repo.findUserById(id);
  if (!user) return { ok: false as const, status: 404, error: "User not found" };
  if (!canManageTargetUser(actor, user.enterpriseId)) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (user.role === "ADMIN" && !isSuperAdminActor(actor)) {
    return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
  }
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot change role for super admin" };
  }
  const updated = await repo.updateUser(id, { role });
  if (actor?.id) await recordAuditLog({ userId: actor.id, enterpriseId: user.enterpriseId, action: "USER_ROLE_CHANGED" });
  return { ok: true as const, value: toAdminUserPayload(updated) };
}

export async function updateOwnEnterpriseUser(
  id: number,
  data: { active?: boolean; role?: UserRole },
  actor?: { id?: number; enterpriseId?: string; email?: string },
) {
  const user = await repo.findUserById(id);
  if (!user) return { ok: false as const, status: 404, error: "User not found" };
  if (!canManageTargetUser(actor, user.enterpriseId)) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (user.role === "ADMIN" && !isSuperAdminActor(actor)) {
    return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
  }
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot modify super admin" };
  }
  const updateData: { active?: boolean; role?: UserRole } = {};
  if (typeof data.active === "boolean") updateData.active = data.active;
  if (data.role && data.role !== "ENTERPRISE_ADMIN") {
    if (data.role === "ADMIN" && !isSuperAdminActor(actor)) {
      return { ok: false as const, status: 403, error: "Role not assignable" };
    }
    updateData.role = data.role;
  }
  const updated = await repo.updateUser(id, updateData);
  if (updateData.active === false) {
    await repo.revokeActiveRefreshTokens(id);
  }
  if (actor?.id) await recordAuditLog({ userId: actor.id, enterpriseId: user.enterpriseId, action: "USER_UPDATED" });
  return { ok: true as const, value: toAdminUserPayload(updated) };
}

export async function listEnterprises() {
  const enterprises = await repo.listEnterprises(buildVisibleEnterpriseWhere({}));
  return enterprises.map(toAdminEnterprisePayload);
}

export async function searchEnterprises(filters: AdminEnterpriseSearchFilters) {
  const where = buildVisibleEnterpriseWhere(buildAdminEnterpriseSearchWhere(filters));
  const [total, records] = await Promise.all([
    repo.countEnterprisesByWhere(where),
    repo.listEnterprisesByWhere(where, filters.page, filters.pageSize),
  ]);
  const strictResponse = toAdminEnterpriseSearchResponse(records.map(toAdminEnterprisePayload), filters, total);
  if (!shouldUseFuzzyFallback(total, filters.query)) {
    return strictResponse;
  }

  const fuzzyWhere = buildVisibleEnterpriseWhere({});
  const candidateTotal = await repo.countEnterprisesByWhere(fuzzyWhere);
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) {
    return strictResponse;
  }

  const candidates = await repo.listEnterpriseFuzzyCandidatesByWhere(fuzzyWhere, 1, candidateTotal);
  const fuzzyPage = fuzzyFilterAndPaginate(candidates, {
    query: filters.query,
    pagination: filters,
    matches: matchesAdminEnterpriseFuzzyCandidate,
  });

  const pageIds = fuzzyPage.items.map((enterprise) => enterprise.id);
  if (pageIds.length === 0) {
    return toAdminEnterpriseSearchResponse([], filters, fuzzyPage.total);
  }

  const pageRecords = await repo.listEnterprisesByIds(pageIds);
  const recordsById = new Map(pageRecords.map((record) => [record.id, record]));
  const orderedItems = pageIds
    .map((id) => recordsById.get(id))
    .filter((record): record is (typeof pageRecords)[number] => Boolean(record))
    .map(toAdminEnterprisePayload);

  return toAdminEnterpriseSearchResponse(orderedItems, filters, fuzzyPage.total);
}

export async function createEnterprise(input: { name: string; code?: string | null }, actorId?: number) {
  const nameRaw = input.name.trim();
  if (!nameRaw) return { ok: false as const, status: 400, error: "Enterprise name is required" };
  if (nameRaw.length > 120) return { ok: false as const, status: 400, error: "Enterprise name is too long" };
  const requestedCode = input.code?.trim().toUpperCase() ?? "";
  if (requestedCode && !ENTERPRISE_CODE_REGEX.test(requestedCode)) {
    return { ok: false as const, status: 400, error: "Code must be 3-16 uppercase letters or numbers" };
  }

  const createWithCode = async (code: string) => {
    const created = await repo.createEnterpriseWithFlags(nameRaw, code, defaultEnterpriseFeatureFlags);
    if (actorId) await recordAuditLog({ userId: actorId, action: "ENTERPRISE_CREATED" });
    return {
      ok: true as const,
      value: {
        ...created,
        users: 0,
        admins: 0,
        enterpriseAdmins: 0,
        staff: 0,
        students: 0,
        modules: 0,
        teams: 0,
      },
    };
  };

  if (requestedCode) {
    const exists = await repo.findEnterpriseByCode(requestedCode);
    if (exists) return { ok: false as const, status: 409, error: "Enterprise code already exists" };
    try {
      return await createWithCode(requestedCode);
    } catch (err) {
      if (isEnterpriseCodeUniqueConstraintError(err)) {
        return { ok: false as const, status: 409, error: "Enterprise code already exists" };
      }
      throw err;
    }
  }

  for (let attempt = 0; attempt < ENTERPRISE_CREATE_MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = await enterpriseCodeGenerator.generateFromName(nameRaw);
    try {
      return await createWithCode(code);
    } catch (err) {
      if (isEnterpriseCodeUniqueConstraintError(err)) {
        continue;
      }
      throw err;
    }
  }

  return { ok: false as const, status: 409, error: "Enterprise code already exists" };
}

export async function listEnterpriseUsers(enterpriseId: string) {
  const exists = await repo.findEnterpriseById(enterpriseId);
  if (!exists) return { ok: false as const, status: 404, error: "Enterprise not found" };
  const users = await repo.listUsersByEnterprise(enterpriseId);
  return { ok: true as const, value: users.map(toAdminUserPayload) };
}

export async function searchEnterpriseUsers(enterpriseId: string, filters: AdminUserSearchFilters) {
  const exists = await repo.findEnterpriseById(enterpriseId);
  if (!exists) return { ok: false as const, status: 404, error: "Enterprise not found" };
  return { ok: true as const, value: await searchUsersWithScope(filters, enterpriseId) };
}

export async function updateEnterpriseUser(
  enterpriseId: string,
  id: number,
  data: { active?: boolean; role?: UserRole },
  actorId?: number,
) {
  const user = await repo.findUserInEnterprise(id, enterpriseId);
  if (!user) return { ok: false as const, status: 404, error: "User not found" };
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot modify super admin" };
  }
  const updateData: { active?: boolean; role?: UserRole } = {};
  if (typeof data.active === "boolean") updateData.active = data.active;
  if (data.role) updateData.role = data.role;
  const updated = await repo.updateUser(id, updateData);
  if (updateData.active === false) {
    await repo.revokeActiveRefreshTokens(id);
  }
  if (actorId) {
    const action = updateData.role && updateData.role !== user.role ? "USER_ROLE_CHANGED" : "USER_UPDATED";
    await recordAuditLog({ userId: actorId, enterpriseId, action });
  }
  return { ok: true as const, value: toAdminUserPayload(updated) };
}

export async function inviteEnterpriseAdmin(
  input: { enterpriseId: string; email: string },
  actorId?: number,
) {
  if (!actorId) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false as const, status: 400, error: "Email is required" };
  }
  if (!ENTERPRISE_INVITE_EMAIL_REGEX.test(normalizedEmail)) {
    return { ok: false as const, status: 400, error: "Email must be a valid email address" };
  }

  const enterprise = await repo.findEnterpriseById(input.enterpriseId);
  if (!enterprise) {
    return { ok: false as const, status: 404, error: "Enterprise not found" };
  }
  const enterpriseLabel = enterprise.name?.trim() || "your enterprise";

  const existingUser = await repo.findUserByEnterpriseAndEmail(input.enterpriseId, normalizedEmail);
  if (existingUser && (existingUser.role === "ADMIN" || existingUser.role === "ENTERPRISE_ADMIN")) {
    return { ok: false as const, status: 409, error: "User already has enterprise admin access" };
  }
  const globalEmailMatch = await repo.findUserByEmail(normalizedEmail);
  const isHoldingEnterpriseAccount = globalEmailMatch?.enterprise?.code === REMOVED_USERS_ENTERPRISE_CODE;
  if (globalEmailMatch && globalEmailMatch.enterpriseId !== input.enterpriseId && !isHoldingEnterpriseAccount) {
    return {
      ok: false as const,
      status: 409,
      error: "This email is already used in another enterprise. Invite a different email.",
    };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + ENTERPRISE_ADMIN_INVITE_TTL_MS);
  await repo.createEnterpriseAdminInviteToken({
    enterpriseId: input.enterpriseId,
    email: normalizedEmail,
    tokenHash,
    invitedByUserId: actorId,
    expiresAt,
  });

  const acceptUrl = `${appBaseUrl}/accept-enterprise-admin-invite?token=${token}`;
  const safeEnterpriseLabel = escapeHtml(enterpriseLabel);
  const safeAcceptUrl = escapeHtml(acceptUrl);
  const text = [
    "Team Feedback enterprise admin invitation",
    "",
    `Enterprise: ${enterpriseLabel}`,
    "Role: Enterprise Admin",
    "",
    "This access allows you to manage enterprise users, modules, and related settings.",
    "",
    `Accept your invite: ${acceptUrl}`,
    "",
    "This link can only be used once and expires in 7 days.",
    "You are receiving this because this email address was entered for enterprise admin access.",
    "If you were not expecting this invite, you can ignore this email.",
  ].join("\n");
  await sendEmail({
    to: normalizedEmail,
    subject: "Enterprise admin invite",
    text,
    html: `<p><strong>Team Feedback enterprise admin invitation</strong></p><p><strong>Enterprise:</strong> ${safeEnterpriseLabel}<br/><strong>Role:</strong> Enterprise Admin</p><p>This access allows you to manage enterprise users, modules, and related settings.</p><p><a href="${safeAcceptUrl}">Accept your invite</a></p><p>This link can only be used once and expires in 7 days.</p><p>You are receiving this because this email address was entered for enterprise admin access.</p><p>If you were not expecting this invite, you can ignore this email.</p>`,
  });

  if (actorId) {
    await recordAuditLog({ userId: actorId, enterpriseId: input.enterpriseId, action: "USER_UPDATED" });
  }

  return {
    ok: true as const,
    value: {
      email: normalizedEmail,
      expiresAt,
    },
  };
}

export async function deleteEnterprise(
  targetEnterpriseId: string,
  actingEnterpriseId: string | undefined,
  actorId?: number,
) {
  if (actingEnterpriseId === targetEnterpriseId) {
    return { ok: false as const, status: 400, error: "Cannot delete your own enterprise" };
  }
  const enterprise = await repo.findEnterpriseForDeletion(targetEnterpriseId);
  if (!enterprise) return { ok: false as const, status: 404, error: "Enterprise not found" };
  if (enterprise._count.users > 0 || enterprise._count.modules > 0 || enterprise._count.teams > 0) {
    return {
      ok: false as const,
      status: 400,
      error: `Cannot delete enterprise while it has users (${enterprise._count.users}), modules (${enterprise._count.modules}), or teams (${enterprise._count.teams}).`,
    };
  }
  await repo.deleteEnterpriseWithDependencies(targetEnterpriseId, enterprise._count.auditLogs);
  if (actorId) await recordAuditLog({ userId: actorId, action: "ENTERPRISE_DELETED" });
  return { ok: true as const, value: { success: true } };
}

export async function getAuditLogs(enterpriseId: string, filters: { from?: Date; to?: Date; limit?: number; cursor?: number }) {
  const logs = await listAuditLogs({ enterpriseId, ...filters });
  return logs.map((entry) => ({
    id: entry.id,
    action: entry.action,
    createdAt: entry.createdAt,
    ip: entry.ip,
    userAgent: entry.userAgent,
    user: {
      id: entry.user.id,
      email: entry.user.email,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      role: entry.user.role,
    },
  }));
}

function toAdminUserPayload(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  enterpriseId?: string;
  role: string;
  active: boolean;
  enterprise?: {
    id: string;
    name: string;
    code: string;
  } | null;
}) {
  return {
    ...user,
    isStaff: user.role !== "STUDENT",
    role: user.role as UserRole,
  };
}

function toAdminUserSearchResponse(
  records: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    enterpriseId?: string;
    role: string;
    active: boolean;
    enterprise?: {
      id: string;
      name: string;
      code: string;
    } | null;
  }>,
  filters: { query: string | null; role: UserRole | null; active: boolean | null; page: number; pageSize: number },
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items: records.map(toAdminUserPayload),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
    role: filters.role,
    active: filters.active,
  };
}

function toAdminEnterprisePayload(enterprise: {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  users: Array<{ role: UserRole }>;
  _count: { users: number; modules: number; teams: number };
}) {
  const roleCount = enterprise.users.reduce(
    (acc, user) => {
      if (user.role === "ADMIN") acc.admins += 1;
      else if (user.role === "ENTERPRISE_ADMIN") acc.enterpriseAdmins += 1;
      else if (user.role === "STAFF") acc.staff += 1;
      else acc.students += 1;
      return acc;
    },
    { admins: 0, enterpriseAdmins: 0, staff: 0, students: 0 },
  );
  return {
    id: enterprise.id,
    code: enterprise.code,
    name: enterprise.name,
    createdAt: enterprise.createdAt,
    users: enterprise._count.users,
    modules: enterprise._count.modules,
    teams: enterprise._count.teams,
    ...roleCount,
  };
}

function toAdminEnterpriseSearchResponse(
  items: Array<{
    id: string;
    code: string;
    name: string;
    createdAt: Date;
    users: number;
    admins: number;
    enterpriseAdmins: number;
    staff: number;
    students: number;
    modules: number;
    teams: number;
  }>,
  filters: { query: string | null; page: number; pageSize: number },
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
  };
}

function buildVisibleEnterpriseWhere(where: Prisma.EnterpriseWhereInput): Prisma.EnterpriseWhereInput {
  return {
    AND: [
      where,
      { code: { not: REMOVED_USERS_ENTERPRISE_CODE } },
    ],
  };
}
