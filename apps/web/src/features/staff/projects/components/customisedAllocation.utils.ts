import type {
  CustomAllocationCriteriaStrategy,
  CustomAllocationNonRespondentStrategy,
  CustomAllocationPreview,
  CustomAllocationQuestionnaireListing,
} from "@/features/projects/api/teamAllocation";

export type CriteriaStrategy = CustomAllocationCriteriaStrategy;
export type NonRespondentStrategy = CustomAllocationNonRespondentStrategy;

export type CriteriaConfig = {
  strategy: CriteriaStrategy;
  weight: number;
};

export type CustomAllocationCriteriaInput = {
  questionId: number;
  strategy: CriteriaStrategy;
  weight: number;
};

export type CustomisedPreviewInputSnapshot = {
  questionnaireTemplateId: number;
  teamCount: number;
  minTeamSize?: number;
  maxTeamSize?: number;
  nonRespondentStrategy: NonRespondentStrategy;
  criteria: CustomAllocationCriteriaInput[];
};

export type CustomAllocationQuestionnaire =
  CustomAllocationQuestionnaireListing["questionnaires"][number];
export type CustomAllocationQuestion = CustomAllocationQuestionnaire["eligibleQuestions"][number];

const SUPPORTED_CRITERIA_TYPES = new Set(["multiple-choice", "rating", "slider"]);
export const WEIGHT_OPTIONS = [1, 2, 3, 4, 5] as const;

export function isSupportedCriteriaQuestion(question: CustomAllocationQuestion) {
  return SUPPORTED_CRITERIA_TYPES.has(question.type);
}

export function sortByTemplateName(templates: CustomAllocationQuestionnaire[]) {
  return [...templates].sort((left, right) => left.templateName.localeCompare(right.templateName));
}

export function countEligibleQuestions(template: CustomAllocationQuestionnaire) {
  return template.eligibleQuestions.filter(isSupportedCriteriaQuestion).length;
}

export function toFullName(member: { firstName: string; lastName: string; email: string }) {
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return fullName.length > 0 ? fullName : member.email;
}

export function getQualityLabel(score: number): "Good" | "Fair" | "Poor" {
  if (score >= 0.75) {
    return "Good";
  }
  if (score >= 0.5) {
    return "Fair";
  }
  return "Poor";
}

export function toPreviewInputKey(input: CustomisedPreviewInputSnapshot) {
  return JSON.stringify({
    questionnaireTemplateId: input.questionnaireTemplateId,
    teamCount: input.teamCount,
    minTeamSize: input.minTeamSize ?? null,
    maxTeamSize: input.maxTeamSize ?? null,
    nonRespondentStrategy: input.nonRespondentStrategy,
    criteria: input.criteria.map((criterion) => ({
      questionId: criterion.questionId,
      strategy: criterion.strategy,
      weight: criterion.weight,
    })),
  });
}

export function parseOptionalPositiveIntegerInput(rawValue: string) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

export function formatTeamCriterionSummary(
  criterion: CustomAllocationPreview["teamCriteriaSummary"][number]["criteria"][number],
) {
  if (criterion.summary.kind === "none") {
    return `No responses (${criterion.responseCount})`;
  }

  if (criterion.summary.kind === "numeric") {
    return `avg ${criterion.summary.average} (min ${criterion.summary.min}, max ${criterion.summary.max})`;
  }

  return criterion.summary.categories.map((category) => `${category.value}: ${category.count}`).join(", ");
}

export function toDefaultTeamNameMap(nextPreview: CustomAllocationPreview) {
  return nextPreview.previewTeams.reduce<Record<number, string>>((names, team) => {
    names[team.index] = team.suggestedName;
    return names;
  }, {});
}

export function getInputValidationError(args: {
  selectedQuestionnaire: CustomAllocationQuestionnaire | null;
  teamCountInput: string;
  minTeamSizeInput: string;
  maxTeamSizeInput: string;
}) {
  const { selectedQuestionnaire, teamCountInput, minTeamSizeInput, maxTeamSizeInput } = args;
  if (!selectedQuestionnaire) {
    return "Select a questionnaire first.";
  }

  const parsedTeamCount = Number(teamCountInput);
  if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) {
    return "Team count must be a positive integer.";
  }

  const parsedMinTeamSize = parseOptionalPositiveIntegerInput(minTeamSizeInput);
  if (parsedMinTeamSize === null) {
    return "Minimum students per team must be a positive integer when provided.";
  }

  const parsedMaxTeamSize = parseOptionalPositiveIntegerInput(maxTeamSizeInput);
  if (parsedMaxTeamSize === null) {
    return "Maximum students per team must be a positive integer when provided.";
  }

  if (
    parsedMinTeamSize !== undefined &&
    parsedMaxTeamSize !== undefined &&
    parsedMinTeamSize > parsedMaxTeamSize
  ) {
    return "Minimum students per team cannot be greater than maximum students per team.";
  }

  return null;
}

export function getCurrentPreviewInputSnapshot(args: {
  selectedQuestionnaire: CustomAllocationQuestionnaire | null;
  teamCountInput: string;
  minTeamSizeInput: string;
  maxTeamSizeInput: string;
  nonRespondentStrategy: NonRespondentStrategy;
  criteriaPayload: CustomAllocationCriteriaInput[];
}): CustomisedPreviewInputSnapshot | null {
  const {
    selectedQuestionnaire,
    teamCountInput,
    minTeamSizeInput,
    maxTeamSizeInput,
    nonRespondentStrategy,
    criteriaPayload,
  } = args;
  if (!selectedQuestionnaire) {
    return null;
  }

  const parsedTeamCount = Number(teamCountInput);
  if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) {
    return null;
  }
  const parsedMinTeamSize = parseOptionalPositiveIntegerInput(minTeamSizeInput);
  const parsedMaxTeamSize = parseOptionalPositiveIntegerInput(maxTeamSizeInput);
  if (parsedMinTeamSize === null || parsedMaxTeamSize === null) {
    return null;
  }
  if (
    parsedMinTeamSize !== undefined &&
    parsedMaxTeamSize !== undefined &&
    parsedMinTeamSize > parsedMaxTeamSize
  ) {
    return null;
  }

  return {
    questionnaireTemplateId: selectedQuestionnaire.id,
    teamCount: parsedTeamCount,
    ...(parsedMinTeamSize !== undefined ? { minTeamSize: parsedMinTeamSize } : {}),
    ...(parsedMaxTeamSize !== undefined ? { maxTeamSize: parsedMaxTeamSize } : {}),
    nonRespondentStrategy,
    criteria: criteriaPayload,
  };
}

export function isCurrentInputMatchingPreview(args: {
  preview: CustomAllocationPreview | null;
  previewInputKey: string | null;
  currentSnapshot: CustomisedPreviewInputSnapshot | null;
}) {
  const { preview, previewInputKey, currentSnapshot } = args;
  if (!preview || !previewInputKey) {
    return false;
  }
  if (!currentSnapshot) {
    return false;
  }
  return toPreviewInputKey(currentSnapshot) === previewInputKey;
}

export function getTeamName(
  teamNames: Record<number, string>,
  index: number,
  fallbackName: string,
) {
  return teamNames[index] ?? fallbackName;
}

export function getTeamNameValidationError(
  preview: CustomAllocationPreview | null,
  teamNames: Record<number, string>,
) {
  if (!preview) {
    return "Generate a preview before confirming.";
  }

  const normalizedNames = preview.previewTeams.map((team) =>
    getTeamName(teamNames, team.index, team.suggestedName).trim(),
  );
  if (normalizedNames.some((name) => name.length === 0)) {
    return "Team names cannot be empty.";
  }

  const uniqueNames = new Set(normalizedNames.map((name) => name.toLowerCase()));
  if (uniqueNames.size !== normalizedNames.length) {
    return "Team names must be unique.";
  }

  return null;
}

export function getTeamNamesForApply(
  preview: CustomAllocationPreview | null,
  teamNames: Record<number, string>,
) {
  if (!preview) {
    return [];
  }
  return preview.previewTeams.map((team) =>
    getTeamName(teamNames, team.index, team.suggestedName).trim(),
  );
}