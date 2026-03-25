import { fail, parsePositiveInt, type ParseResult } from "../../shared/parse.js";

export function parseCalendarUserIdQuery(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "userId");
  return parsed.ok ? parsed : fail("Invalid user ID");
}
