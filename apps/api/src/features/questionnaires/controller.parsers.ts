import { fail, ok, parseOptionalTrimmedString, parsePositiveInt, parseTrimmedString, type ParseResult } from "../../shared/parse.js";

function parseBodyRecord(body: unknown, error = "Invalid request body"): ParseResult<Record<string, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(error);
  }
  return ok(body as Record<string, unknown>);
}

export function parseQuestionnaireTemplateId(value: unknown, label = "Invalid questionnaire template ID"): ParseResult<number> {
  const parsed = parsePositiveInt(value, "id");
  return parsed.ok ? parsed : fail(label);
}

export function parseCreateOrUpdateTemplateBody(body: unknown): ParseResult<{
  templateName: string;
  questions: unknown[];
  isPublic?: boolean;
}> {
  const parsedBody = parseBodyRecord(body, "Invalid request body");
  if (!parsedBody.ok) return parsedBody;

  const templateName = parseTrimmedString(parsedBody.value.templateName, "templateName");
  if (!templateName.ok || !Array.isArray(parsedBody.value.questions)) {
    return fail("Invalid request body");
  }

  const rawIsPublic = parsedBody.value.isPublic;
  if (rawIsPublic !== undefined && typeof rawIsPublic !== "boolean") {
    return fail("Invalid request body");
  }

  return ok({
    templateName: templateName.value,
    questions: parsedBody.value.questions,
    ...(typeof rawIsPublic === "boolean" ? { isPublic: rawIsPublic } : {}),
  });
}
