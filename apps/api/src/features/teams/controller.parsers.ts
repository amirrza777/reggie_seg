import { fail, parsePositiveInt, type ParseResult } from "../../shared/parse.js";

export function parseDismissTeamIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "teamId");
  return parsed.ok ? parsed : fail("Invalid team ID");
}
