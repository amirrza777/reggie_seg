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
