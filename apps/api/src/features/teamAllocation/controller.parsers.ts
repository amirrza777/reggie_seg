import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  parseOptionalPositiveInt,
  parsePositiveInt,
  parseTrimmedString,
  type ParseResult,
} from "../../shared/parse.js";

export function parseStaffActor(req: AuthRequest): ParseResult<number> {
  const userId = req.user?.sub;
  if (!userId) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, value: userId };
}

export function parseProjectIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "projectId");
  if (!parsed.ok) return { ok: false, error: "Invalid project ID" };
  return parsed;
}

export function parseTeamIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "teamId");
  if (!parsed.ok) return { ok: false, error: "Invalid team ID" };
  return parsed;
}

export function parseDraftTeamIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "draft team ID");
  if (!parsed.ok) return { ok: false, error: "Invalid draft team ID" };
  return parsed;
}

export function parseManualAllocationWorkspaceQuery(query: unknown): ParseResult<string | null> {
  const raw = typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};
  const parsed = parseSearchQuery(raw.q);
  if (!parsed.ok) {
    return { ok: false, error: "q must be a string with up to 120 characters" };
  }
  return parsed;
}

export function parseRandomAllocationPreviewQuery(query: unknown): ParseResult<{
  teamCount: number;
  minTeamSize?: number;
  maxTeamSize?: number;
}> {
  const raw = typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};
  const teamCount = parsePositiveInt(raw.teamCount, "teamCount");
  if (!teamCount.ok) return { ok: false, error: "teamCount must be a positive integer" };
  const minTeamSize = parseOptionalPositiveInt(raw.minTeamSize, "minTeamSize");
  if (!minTeamSize.ok) return { ok: false, error: "minTeamSize must be a positive integer when provided" };
  const maxTeamSize = parseOptionalPositiveInt(raw.maxTeamSize, "maxTeamSize");
  if (!maxTeamSize.ok) return { ok: false, error: "maxTeamSize must be a positive integer when provided" };
  if (
    minTeamSize.value !== undefined &&
    maxTeamSize.value !== undefined &&
    minTeamSize.value > maxTeamSize.value
  ) {
    return { ok: false, error: "minTeamSize cannot be greater than maxTeamSize" };
  }

  return {
    ok: true,
    value: {
      teamCount: teamCount.value,
      ...(minTeamSize.value !== undefined ? { minTeamSize: minTeamSize.value } : {}),
      ...(maxTeamSize.value !== undefined ? { maxTeamSize: maxTeamSize.value } : {}),
    },
  };
}

export function parseRandomAllocationApplyBody(body: unknown): ParseResult<{
  teamCount: number;
  teamNames?: string[];
  minTeamSize?: number;
  maxTeamSize?: number;
}> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const teamCount = parsePositiveInt(raw.teamCount, "teamCount");
  if (!teamCount.ok) return { ok: false, error: "teamCount must be a positive integer" };
  const minTeamSize = parseOptionalPositiveInt(raw.minTeamSize, "minTeamSize");
  if (!minTeamSize.ok) return { ok: false, error: "minTeamSize must be a positive integer when provided" };
  const maxTeamSize = parseOptionalPositiveInt(raw.maxTeamSize, "maxTeamSize");
  if (!maxTeamSize.ok) return { ok: false, error: "maxTeamSize must be a positive integer when provided" };
  if (
    minTeamSize.value !== undefined &&
    maxTeamSize.value !== undefined &&
    minTeamSize.value > maxTeamSize.value
  ) {
    return { ok: false, error: "minTeamSize cannot be greater than maxTeamSize" };
  }

  const rawTeamNames = raw.teamNames;
  if (rawTeamNames !== undefined) {
    if (!Array.isArray(rawTeamNames) || rawTeamNames.some((teamName) => typeof teamName !== "string")) {
      return { ok: false, error: "teamNames must be an array of strings when provided" };
    }
  }

  return {
    ok: true,
    value: {
      teamCount: teamCount.value,
      ...(Array.isArray(rawTeamNames) ? { teamNames: rawTeamNames.map((teamName) => teamName.trim()) } : {}),
      ...(minTeamSize.value !== undefined ? { minTeamSize: minTeamSize.value } : {}),
      ...(maxTeamSize.value !== undefined ? { maxTeamSize: maxTeamSize.value } : {}),
    },
  };
}

export function parseManualAllocationBody(body: unknown): ParseResult<{ teamName: string; studentIds: number[] }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const rawStudentIds = raw.studentIds;
  if (!Array.isArray(rawStudentIds)) {
    return { ok: false, error: "studentIds must be an array of numbers" };
  }
  const studentIds = rawStudentIds.map((studentId) => Number(studentId));
  if (studentIds.some((studentId) => Number.isNaN(studentId))) {
    return { ok: false, error: "studentIds must be an array of numbers" };
  }

  const teamName = typeof raw.teamName === "string" ? raw.teamName : "";
  return { ok: true, value: { teamName, studentIds } };
}

export function parseCreateTeamForProjectBody(body: unknown): ParseResult<{ projectId: number; teamName: string }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const projectId = parsePositiveInt(raw.projectId, "projectId");
  const teamName = parseTrimmedString(raw.teamName, "teamName");
  if (!projectId.ok || !teamName.ok) {
    return { ok: false, error: "Invalid request body" };
  }
  return { ok: true, value: { projectId: projectId.value, teamName: teamName.value } };
}

export function parseCreateTeamInviteBody(body: unknown): ParseResult<{
  teamId: number;
  inviteeEmail: string;
  inviteeId?: number;
  message?: string;
}> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const teamId = parsePositiveInt(raw.teamId, "teamId");
  if (!teamId.ok) return { ok: false, error: "Invalid request body" };
  const inviteeEmail = typeof raw.inviteeEmail === "string" ? raw.inviteeEmail : "";
  if (!inviteeEmail) return { ok: false, error: "Invalid request body" };
  const inviteeId = raw.inviteeId === undefined ? { ok: true as const, value: undefined } : parsePositiveInt(raw.inviteeId, "inviteeId");
  if (!inviteeId.ok) return { ok: false, error: "Invalid request body" };
  const message = typeof raw.message === "string" ? raw.message : undefined;
  return {
    ok: true,
    value: {
      teamId: teamId.value,
      inviteeEmail,
      ...(inviteeId.value !== undefined ? { inviteeId: inviteeId.value } : {}),
      ...(message !== undefined ? { message } : {}),
    },
  };
}

export function parseInviteIdParam(value: unknown): ParseResult<string> {
  const inviteId = typeof value === "string" ? value.trim() : "";
  if (!inviteId) return { ok: false, error: "Invalid invite ID" };
  return { ok: true, value: inviteId };
}

export function parseDraftExpectedUpdatedAtBody(body: unknown): ParseResult<{ expectedUpdatedAt?: string }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  if (!Object.prototype.hasOwnProperty.call(raw, "expectedUpdatedAt")) {
    return { ok: true, value: {} };
  }
  if (typeof raw.expectedUpdatedAt !== "string") {
    return { ok: false, error: "expectedUpdatedAt must be an ISO datetime string when provided" };
  }
  return { ok: true, value: { expectedUpdatedAt: raw.expectedUpdatedAt } };
}

export function parseUpdateDraftBody(body: unknown): ParseResult<{
  teamName?: string;
  studentIds?: number[];
  expectedUpdatedAt?: string;
}> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const hasTeamName = Object.prototype.hasOwnProperty.call(raw, "teamName");
  const hasStudentIds = Object.prototype.hasOwnProperty.call(raw, "studentIds");
  const hasExpectedUpdatedAt = Object.prototype.hasOwnProperty.call(raw, "expectedUpdatedAt");

  if (!hasTeamName && !hasStudentIds) {
    return { ok: false, error: "Provide teamName and/or studentIds to update draft" };
  }
  if (hasTeamName && typeof raw.teamName !== "string") {
    return { ok: false, error: "teamName must be a non-empty string when provided" };
  }
  if (hasStudentIds && !Array.isArray(raw.studentIds)) {
    return { ok: false, error: "studentIds must be an array of numbers when provided" };
  }
  if (hasExpectedUpdatedAt && typeof raw.expectedUpdatedAt !== "string") {
    return { ok: false, error: "expectedUpdatedAt must be an ISO datetime string when provided" };
  }

  const studentIds =
    hasStudentIds && Array.isArray(raw.studentIds) ? raw.studentIds.map((studentId) => Number(studentId)) : undefined;
  if (hasStudentIds && (studentIds === undefined || studentIds.some((studentId) => Number.isNaN(studentId)))) {
    return { ok: false, error: "studentIds must be an array of numbers when provided" };
  }

  return {
    ok: true,
    value: {
      ...(hasTeamName && typeof raw.teamName === "string" ? { teamName: raw.teamName } : {}),
      ...(studentIds !== undefined ? { studentIds } : {}),
      ...(hasExpectedUpdatedAt && typeof raw.expectedUpdatedAt === "string"
        ? { expectedUpdatedAt: raw.expectedUpdatedAt }
        : {}),
    },
  };
}

export function parseAddUserToTeamBody(body: unknown): ParseResult<{ userId: number; role: "OWNER" | "MEMBER" }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const userId = parsePositiveInt(raw.userId, "userId");
  if (!userId.ok) return { ok: false, error: "Invalid request body" };
  const role = typeof raw.role === "string" ? raw.role.toUpperCase() : "MEMBER";
  return { ok: true, value: { userId: userId.value, role: role === "OWNER" ? "OWNER" : "MEMBER" } };
}
