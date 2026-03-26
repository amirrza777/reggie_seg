export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function ok<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

export function fail<T = never>(error: string): ParseResult<T> {
  return { ok: false, error };
}

export function readSingleString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parsePositiveInt(value: unknown, label: string): ParseResult<number> {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fail(`${label} must be a positive integer`);
  }
  return ok(parsed);
}

export function parseOptionalPositiveInt(value: unknown, label: string): ParseResult<number | undefined> {
  if (value === undefined || value === null || value === "") {
    return ok(undefined);
  }
  const parsed = parsePositiveInt(value, label);
  if (!parsed.ok) return parsed;
  return ok(parsed.value);
}

export function parsePositiveIntArray(value: unknown, label: string): ParseResult<number[]> {
  if (!Array.isArray(value)) {
    return fail(`${label} must be an array of positive integers`);
  }

  const parsedValues: number[] = [];
  for (const entry of value) {
    const parsedEntry = parsePositiveInt(entry, label);
    if (!parsedEntry.ok) {
      return fail(`${label} must be an array of positive integers`);
    }
    parsedValues.push(parsedEntry.value);
  }

  return ok(parsedValues);
}

export function parseBoolean(value: unknown, label: string): ParseResult<boolean> {
  if (typeof value !== "boolean") {
    return fail(`${label} must be a boolean`);
  }
  return ok(value);
}

export function parseTrimmedString(
  value: unknown,
  label: string,
  options?: { maxLength?: number; allowEmpty?: boolean },
): ParseResult<string> {
  if (typeof value !== "string") {
    return fail(`${label} must be a string`);
  }

  const trimmed = value.trim();
  if (!options?.allowEmpty && trimmed.length === 0) {
    return fail(`${label} is required`);
  }
  if (options?.maxLength && trimmed.length > options.maxLength) {
    return fail(`${label} must be ${options.maxLength} characters or fewer`);
  }
  return ok(trimmed);
}

export function parseOptionalTrimmedString(
  value: unknown,
  label: string,
  options?: { maxLength?: number },
): ParseResult<string | undefined> {
  if (value === undefined || value === null || value === "") {
    return ok(undefined);
  }

  const parsed = parseTrimmedString(value, label, { ...options, allowEmpty: false });
  if (!parsed.ok) return parsed;
  return ok(parsed.value.length === 0 ? undefined : parsed.value);
}

export function parseEnum<T extends readonly string[]>(
  value: unknown,
  label: string,
  allowed: T,
): ParseResult<T[number]> {
  if (typeof value !== "string") {
    return fail(`${label} must be one of: ${allowed.join(", ")}`);
  }

  const normalized = value.trim().toUpperCase();
  const matched = allowed.find((entry) => entry === normalized);
  if (!matched) {
    return fail(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return ok(matched);
}

export function parseIsoDate(value: unknown, label: string): ParseResult<Date> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fail(`${label} must be a valid date string`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fail(`${label} must be a valid date string`);
  }
  return ok(parsed);
}

export function parseOptionalIsoDate(value: unknown, label: string): ParseResult<Date | null | undefined> {
  if (value === undefined) return ok(undefined);
  if (value === null || value === "") return ok(null);
  const parsed = parseIsoDate(value, label);
  if (!parsed.ok) return parsed;
  return ok(parsed.value);
}
