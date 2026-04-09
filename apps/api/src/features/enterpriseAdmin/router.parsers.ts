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
