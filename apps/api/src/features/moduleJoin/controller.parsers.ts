import { fail, parsePositiveInt, parseTrimmedString, type ParseResult } from "../../shared/parse.js";
import { normalizeModuleJoinCode } from "./code.js";

export function parseModuleJoinCodeBody(body: unknown): ParseResult<{ code: string }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const parsed = parseTrimmedString(raw.code, "code");
  if (!parsed.ok) {
    return fail("code is required");
  }
  return { ok: true, value: { code: parsed.value } };
}

export function parseModuleIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "moduleId");
  if (!parsed.ok) return fail("moduleId must be a positive integer");
  return parsed;
}

export function parseNormalizedModuleJoinCode(value: string): ParseResult<string> {
  const normalized = normalizeModuleJoinCode(value);
  if (!normalized) {
    return fail("code must be a valid module join code");
  }
  return { ok: true, value: normalized };
}
