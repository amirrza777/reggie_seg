import { fail, parsePositiveInt, type ParseResult } from "../../shared/parse.js";

export function parseArchiveEntityId(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "id");
  return parsed.ok ? parsed : fail("Invalid id");
}
