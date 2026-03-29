import {
  fail,
  ok,
  parseEnum,
  parsePositiveInt,
  parseTrimmedString,
  type ParseResult,
} from "../../shared/parse.js";
import {
  QUESTIONNAIRE_PURPOSE_VALUES,
  type QuestionnairePurpose,
} from "./types.js";

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
  purpose?: QuestionnairePurpose;
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

  const rawPurpose = parsedBody.value.purpose;
  if (rawPurpose !== undefined) {
    const parsedPurpose = parseEnum(rawPurpose, "purpose", QUESTIONNAIRE_PURPOSE_VALUES);
    if (!parsedPurpose.ok) {
      return fail("Invalid request body");
    }

    return ok({
      templateName: templateName.value,
      questions: parsedBody.value.questions,
      ...(typeof rawIsPublic === "boolean" ? { isPublic: rawIsPublic } : {}),
      purpose: parsedPurpose.value,
    });
  }

  return ok({
    templateName: templateName.value,
    questions: parsedBody.value.questions,
    ...(typeof rawIsPublic === "boolean" ? { isPublic: rawIsPublic } : {}),
  });
}

export function parseOptionalQuestionnairePurposeQuery(
  value: unknown,
): ParseResult<QuestionnairePurpose | undefined> {
  if (value === undefined || value === null || value === "") {
    return ok(undefined);
  }

  const parsed = parseEnum(value, "purpose", QUESTIONNAIRE_PURPOSE_VALUES);
  if (!parsed.ok) {
    return fail("purpose must be PEER_ASSESSMENT, CUSTOMISED_ALLOCATION, or GENERAL_PURPOSE");
  }
  return ok(parsed.value);
}