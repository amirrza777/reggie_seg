import type {
  CustomAllocationApplyInput,
  CustomAllocationCriteriaStrategy,
  CustomAllocationNonRespondentStrategy,
  CustomAllocationPreviewInput,
} from "./service.js";

type ValidationResult<T> = { ok: true; value: T } | { ok: false; code: CustomAllocationValidationCode };

export type CustomAllocationValidationCode =
  | "INVALID_PROJECT_ID"
  | "INVALID_TEMPLATE_ID"
  | "INVALID_TEAM_COUNT"
  | "INVALID_NON_RESPONDENT_STRATEGY"
  | "INVALID_CRITERIA"
  | "INVALID_PREVIEW_ID"
  | "INVALID_TEAM_NAMES";

function asPositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function isValidCriteriaStrategy(value: unknown): value is CustomAllocationCriteriaStrategy {
  return value === "diversify" || value === "group" || value === "ignore";
}

function isValidNonRespondentStrategy(value: unknown): value is CustomAllocationNonRespondentStrategy {
  return value === "distribute_randomly" || value === "exclude";
}

export function parseCustomAllocationProjectId(rawProjectId: unknown): ValidationResult<number> {
  const projectId = Number(rawProjectId);
  if (Number.isNaN(projectId)) {
    return { ok: false, code: "INVALID_PROJECT_ID" };
  }
  return { ok: true, value: projectId };
}

export function parseCustomAllocationCoverageTemplateId(
  rawQuestionnaireTemplateId: unknown,
): ValidationResult<number> {
  const questionnaireTemplateId = asPositiveInteger(rawQuestionnaireTemplateId);
  if (questionnaireTemplateId === null) {
    return { ok: false, code: "INVALID_TEMPLATE_ID" };
  }
  return { ok: true, value: questionnaireTemplateId };
}

export function parseCustomAllocationPreviewBody(body: unknown): ValidationResult<CustomAllocationPreviewInput> {
  const row = body as Record<string, unknown>;
  const questionnaireTemplateId = asPositiveInteger(row?.questionnaireTemplateId);
  if (questionnaireTemplateId === null) {
    return { ok: false, code: "INVALID_TEMPLATE_ID" };
  }

  const teamCount = asPositiveInteger(row?.teamCount);
  if (teamCount === null) {
    return { ok: false, code: "INVALID_TEAM_COUNT" };
  }

  const nonRespondentStrategy = row?.nonRespondentStrategy;
  if (!isValidNonRespondentStrategy(nonRespondentStrategy)) {
    return { ok: false, code: "INVALID_NON_RESPONDENT_STRATEGY" };
  }

  if (!Array.isArray(row?.criteria)) {
    return { ok: false, code: "INVALID_CRITERIA" };
  }

  const criteria = row.criteria.map((criterion) => {
    const criterionRow = criterion as Record<string, unknown>;
    return {
      questionId: asPositiveInteger(criterionRow?.questionId),
      strategy: criterionRow?.strategy,
      weight: asPositiveInteger(criterionRow?.weight),
    };
  });

  const hasInvalidCriteria = criteria.some(
    (criterion) =>
      criterion.questionId === null ||
      !isValidCriteriaStrategy(criterion.strategy) ||
      criterion.weight === null ||
      criterion.weight < 1 ||
      criterion.weight > 5,
  );
  if (hasInvalidCriteria) {
    return { ok: false, code: "INVALID_CRITERIA" };
  }

  return {
    ok: true,
    value: {
      questionnaireTemplateId,
      teamCount,
      nonRespondentStrategy,
      criteria: criteria.map((criterion) => ({
        questionId: criterion.questionId!,
        strategy: criterion.strategy as CustomAllocationCriteriaStrategy,
        weight: criterion.weight!,
      })),
    },
  };
}

export function parseCustomAllocationApplyBody(body: unknown): ValidationResult<CustomAllocationApplyInput> {
  const row = body as Record<string, unknown>;
  const previewId = typeof row?.previewId === "string" ? row.previewId.trim() : "";
  if (!previewId) {
    return { ok: false, code: "INVALID_PREVIEW_ID" };
  }

  const rawTeamNames = row?.teamNames;
  if (rawTeamNames === undefined) {
    return {
      ok: true,
      value: {
        previewId,
      },
    };
  }

  if (!Array.isArray(rawTeamNames) || rawTeamNames.some((teamName) => typeof teamName !== "string")) {
    return { ok: false, code: "INVALID_TEAM_NAMES" };
  }

  return {
    ok: true,
    value: {
      previewId,
      teamNames: rawTeamNames.map((teamName) => teamName.trim()),
    },
  };
}
