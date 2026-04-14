import { parseBoolean, parsePositiveInt, type ParseResult } from "../../../shared/parse.js";

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
): ParseResult<{
  absenceThreshold: number;
  minutesEditWindowDays: number;
  attendanceEditWindowDays: number;
  allowAnyoneToEditMeetings: boolean;
  allowAnyoneToRecordAttendance: boolean;
  allowAnyoneToWriteMinutes: boolean;
}> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const absenceThreshold = parsePositiveInt(raw.absenceThreshold, "absenceThreshold");
  if (!absenceThreshold.ok) {
    return { ok: false, error: "absenceThreshold must be a positive integer" };
  }
  const minutesEditWindowDays = parsePositiveInt(raw.minutesEditWindowDays, "minutesEditWindowDays");
  if (!minutesEditWindowDays.ok) {
    return { ok: false, error: "minutesEditWindowDays must be a positive integer" };
  }
  const attendanceEditWindowDays = parsePositiveInt(raw.attendanceEditWindowDays, "attendanceEditWindowDays");
  if (!attendanceEditWindowDays.ok) {
    return { ok: false, error: "attendanceEditWindowDays must be a positive integer" };
  }
  const allowAnyoneToEditMeetings = parseBoolean(raw.allowAnyoneToEditMeetings, "allowAnyoneToEditMeetings");
  if (!allowAnyoneToEditMeetings.ok) {
    return { ok: false, error: "allowAnyoneToEditMeetings must be a boolean" };
  }
  const allowAnyoneToRecordAttendance = parseBoolean(raw.allowAnyoneToRecordAttendance, "allowAnyoneToRecordAttendance");
  if (!allowAnyoneToRecordAttendance.ok) {
    return { ok: false, error: "allowAnyoneToRecordAttendance must be a boolean" };
  }
  const allowAnyoneToWriteMinutes = parseBoolean(raw.allowAnyoneToWriteMinutes, "allowAnyoneToWriteMinutes");
  if (!allowAnyoneToWriteMinutes.ok) {
    return { ok: false, error: "allowAnyoneToWriteMinutes must be a boolean" };
  }

  return {
    ok: true,
    value: {
      absenceThreshold: absenceThreshold.value,
      minutesEditWindowDays: minutesEditWindowDays.value,
      attendanceEditWindowDays: attendanceEditWindowDays.value,
      allowAnyoneToEditMeetings: allowAnyoneToEditMeetings.value,
      allowAnyoneToRecordAttendance: allowAnyoneToRecordAttendance.value,
      allowAnyoneToWriteMinutes: allowAnyoneToWriteMinutes.value,
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
): ParseResult<{ email: string; firstName?: string; lastName?: string; role?: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" }> {
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

  let role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | undefined;
  if (raw.role !== undefined) {
    if (typeof raw.role !== "string") {
      return { ok: false, error: "role must be STUDENT, STAFF, or ENTERPRISE_ADMIN" };
    }
    const normalizedRole = raw.role.trim().toUpperCase();
    if (normalizedRole !== "STUDENT" && normalizedRole !== "STAFF" && normalizedRole !== "ENTERPRISE_ADMIN") {
      return { ok: false, error: "role must be STUDENT, STAFF, or ENTERPRISE_ADMIN" };
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
