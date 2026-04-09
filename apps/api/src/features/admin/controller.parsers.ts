import {
  parseBoolean,
  parseOptionalIsoDate,
  parseOptionalPositiveInt,
  parseOptionalTrimmedString,
  parsePositiveInt,
  parseTrimmedString,
  type ParseResult,
} from "../../shared/parse.js";
import { isRole } from "./service.js";

function parseUserId(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "user id");
  if (!parsed.ok) return { ok: false, error: "Invalid user id" };
  return parsed;
}

function parseEnterpriseId(value: unknown): ParseResult<string> {
  const parsed = parseTrimmedString(value, "Enterprise id");
  if (!parsed.ok) return { ok: false, error: "Enterprise id is required" };
  return parsed;
}

export function parseAdminUserIdParam(value: unknown) {
  return parseUserId(value);
}

export function parseAdminEnterpriseIdParam(value: unknown) {
  return parseEnterpriseId(value);
}

export function parseUpdateUserRoleBody(body: unknown): ParseResult<ReturnType<typeof parseRole> extends ParseResult<infer T> ? T : never> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  return parseRole(raw.role);
}

export function parseUpdateUserBody(body: unknown): ParseResult<{ active?: boolean; role?: ReturnType<typeof parseRole> extends ParseResult<infer T> ? T : never }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const updates: { active?: boolean; role?: ReturnType<typeof parseRole> extends ParseResult<infer T> ? T : never } = {};

  if (raw.active !== undefined) {
    const active = parseBoolean(raw.active, "active");
    if (!active.ok) return active;
    updates.active = active.value;
  }

  if (raw.role !== undefined) {
    const role = parseRole(raw.role);
    if (!role.ok) return role;
    updates.role = role.value;
  }

  return { ok: true, value: updates };
}

export function parseCreateEnterpriseBody(body: unknown): ParseResult<{ name: string; code: string | null }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const name = parseTrimmedString(raw.name, "name");
  if (!name.ok) return { ok: false, error: "name must be a string" };

  const code = raw.code === null ? { ok: true as const, value: null } : parseOptionalTrimmedString(raw.code, "code");
  if (!code.ok) return { ok: false, error: "code must be a string" };

  return {
    ok: true,
    value: {
      name: name.value,
      code: code.value ?? null,
    },
  };
}

export function parseInviteEnterpriseAdminBody(body: unknown): ParseResult<{ email: string }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const email = parseTrimmedString(raw.email, "email");
  if (!email.ok) return { ok: false, error: "email must be a string" };
  return { ok: true, value: { email: email.value } };
}

export function parseAuditLogsQuery(query: unknown): ParseResult<{ from?: Date; to?: Date; limit?: number; cursor?: number }> {
  const raw = typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};
  const from = parseOptionalIsoDate(raw.from, "from");
  const to = parseOptionalIsoDate(raw.to, "to");
  const limit = parseOptionalPositiveInt(raw.limit, "limit");
  const cursor = parseOptionalPositiveInt(raw.cursor, "cursor");

  return {
    ok: true,
    value: {
      ...(from.ok && from.value instanceof Date ? { from: from.value } : {}),
      ...(to.ok && to.value instanceof Date ? { to: to.value } : {}),
      ...(limit.ok && limit.value !== undefined ? { limit: limit.value } : {}),
      ...(cursor.ok && cursor.value !== undefined ? { cursor: cursor.value } : {}),
    },
  };
}

function parseRole(value: unknown) {
  if (typeof value !== "string") {
    return { ok: false as const, error: "Invalid role" };
  }
  const normalized = value.trim().toUpperCase();
  if (!isRole(normalized)) {
    return { ok: false as const, error: "Invalid role" };
  }
  return { ok: true as const, value: normalized };
}
