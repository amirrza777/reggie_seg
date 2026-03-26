import { fail, ok, parseOptionalTrimmedString, parsePositiveInt, type ParseResult } from "../../../shared/parse.js";

export type StaffMarkingInput = { mark: number | null; formativeFeedback: string | null };

export function parseStaffIdQuery(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "staffId");
  return parsed.ok ? parsed : fail("staffId is required");
}

export function parseModuleIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "moduleId");
  return parsed.ok ? parsed : fail("Valid module ID is required");
}

export function parseTeamIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "teamId");
  return parsed.ok ? parsed : fail("Valid team ID is required");
}

export function parseStudentIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "studentId");
  return parsed.ok ? parsed : fail("Valid student ID is required");
}

export function parseModuleIdQuery(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "moduleId");
  return parsed.ok ? parsed : fail("moduleId is required");
}

export function parseMarkingBody(body: unknown): ParseResult<StaffMarkingInput> {
  const raw = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const rawMark = raw.mark;
  const rawFeedback = raw.formativeFeedback;

  let mark: number | null = null;
  if (rawMark !== undefined && rawMark !== null && rawMark !== "") {
    if (typeof rawMark !== "number" || Number.isNaN(rawMark)) {
      return fail("mark must be a number between 0 and 100.");
    }
    if (rawMark < 0 || rawMark > 100) {
      return fail("mark must be between 0 and 100.");
    }
    mark = Math.round(rawMark * 100) / 100;
  }

  const formativeFeedback = parseOptionalTrimmedString(rawFeedback, "formativeFeedback");
  if (!formativeFeedback.ok) {
    return fail("formativeFeedback must be a string.");
  }

  return ok({ mark, formativeFeedback: formativeFeedback.value ?? null });
}
