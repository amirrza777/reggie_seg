export type ParsedSearchQuery =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

const DEFAULT_MAX_SEARCH_QUERY_LENGTH = 120;

export function parseSearchQuery(
  value: unknown,
  options?: { maxLength?: number; key?: string },
): ParsedSearchQuery {
  const key = options?.key ?? "q";
  const maxLength = options?.maxLength ?? DEFAULT_MAX_SEARCH_QUERY_LENGTH;

  if (value === undefined) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${key} must be a string` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${key} must be ${maxLength} characters or fewer` };
  }

  return { ok: true, value: trimmed };
}
