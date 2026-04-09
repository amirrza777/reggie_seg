import { parseBoolean, parsePositiveInt, type ParseResult } from "../../shared/parse.js";

export function parseFeatureFlagUpdateBody(body: unknown): ParseResult<{ enabled: boolean }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const enabled = parseBoolean(raw.enabled, "enabled");
  if (!enabled.ok) {
    return { ok: false, error: "enabled boolean required" };
  }
  return { ok: true, value: { enabled: enabled.value } };
}

export function parseMeetingSettingsBody(
  body: unknown,
): ParseResult<{ absenceThreshold: number; minutesEditWindowDays: number }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const absenceThreshold = parsePositiveInt(raw.absenceThreshold, "absenceThreshold");
  if (!absenceThreshold.ok) {
    return { ok: false, error: "absenceThreshold must be a positive integer" };
  }
  const minutesEditWindowDays = parsePositiveInt(raw.minutesEditWindowDays, "minutesEditWindowDays");
  if (!minutesEditWindowDays.ok) {
    return { ok: false, error: "minutesEditWindowDays must be a positive integer" };
  }

  return {
    ok: true,
    value: {
      absenceThreshold: absenceThreshold.value,
      minutesEditWindowDays: minutesEditWindowDays.value,
    },
  };
}

export function parseEnterpriseUserUpdateBody(
  body: unknown,
): ParseResult<{ active?: boolean; role?: "STUDENT" | "STAFF" }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const updates: { active?: boolean; role?: "STUDENT" | "STAFF" } = {};

  if (raw.active !== undefined) {
    const active = parseBoolean(raw.active, "active");
    if (!active.ok) {
      return { ok: false, error: "active must be a boolean" };
    }
    updates.active = active.value;
  }

  if (raw.role !== undefined) {
    if (typeof raw.role !== "string") {
      return { ok: false, error: "role must be STUDENT or STAFF" };
    }
    const normalizedRole = raw.role.trim().toUpperCase();
    if (normalizedRole !== "STUDENT" && normalizedRole !== "STAFF") {
      return { ok: false, error: "role must be STUDENT or STAFF" };
    }
    updates.role = normalizedRole;
  }

  return { ok: true, value: updates };
}

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
export function parseEnterpriseUserCreateBody(
  body: unknown,
): ParseResult<{ email: string; firstName?: string; lastName?: string; role?: "STUDENT" | "STAFF" }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (!email) {
    return { ok: false, error: "email is required" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "email must be a valid email address" };
  }

  const firstName =
    raw.firstName === undefined || raw.firstName === null
      ? undefined
      : typeof raw.firstName === "string"
        ? raw.firstName.trim()
        : null;
  if (firstName === null) {
    return { ok: false, error: "firstName must be a string" };
  }

  const lastName =
    raw.lastName === undefined || raw.lastName === null
      ? undefined
      : typeof raw.lastName === "string"
        ? raw.lastName.trim()
        : null;
  if (lastName === null) {
    return { ok: false, error: "lastName must be a string" };
  }

  let role: "STUDENT" | "STAFF" | undefined;
  if (raw.role !== undefined) {
    if (typeof raw.role !== "string") {
      return { ok: false, error: "role must be STUDENT or STAFF" };
    }
    const normalizedRole = raw.role.trim().toUpperCase();
    if (normalizedRole !== "STUDENT" && normalizedRole !== "STAFF") {
      return { ok: false, error: "role must be STUDENT or STAFF" };
    }
    role = normalizedRole;
  }

  return {
    ok: true,
    value: {
      email,
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(role ? { role } : {}),
    },
  };
}
