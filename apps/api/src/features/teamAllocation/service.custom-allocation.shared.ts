import type {
  CustomAllocationCriteriaStrategy,
  CustomAllocationNonRespondentStrategy,
  CustomAllocationQuestionType,
} from "./service.types.js";

const DEFAULT_CUSTOM_ALLOCATION_RESPONSE_THRESHOLD = 80;
export const CUSTOM_ALLOCATION_PREVIEW_TTL_MS = 15 * 60 * 1000;

export type StoredCustomPreviewTeam = {
  index: number;
  suggestedName: string;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    responseStatus: "RESPONDED" | "NO_RESPONSE";
  }>;
};

export type StoredCustomAllocationPreview = {
  previewId: string;
  staffId: number;
  projectId: number;
  questionnaireTemplateId: number;
  generatedAt: Date;
  expiresAt: Date;
  teamCount: number;
  nonRespondentStrategy: CustomAllocationNonRespondentStrategy;
  criteriaSummary: Array<{
    questionId: number;
    strategy: Exclude<CustomAllocationCriteriaStrategy, "ignore">;
    weight: number;
    satisfactionScore: number;
  }>;
  teamCriteriaSummary: Array<{
    teamIndex: number;
    criteria: Array<{
      questionId: number;
      strategy: Exclude<CustomAllocationCriteriaStrategy, "ignore">;
      weight: number;
      responseCount: number;
      summary:
        | {
            kind: "none";
          }
        | {
            kind: "numeric";
            average: number;
            min: number;
            max: number;
          }
        | {
            kind: "categorical";
            categories: Array<{
              value: string;
              count: number;
            }>;
          };
    }>;
  }>;
  overallScore: number;
  previewTeams: StoredCustomPreviewTeam[];
};

const customAllocationPreviewCache = new Map<string, StoredCustomAllocationPreview>();
export type CustomAllocationStaleStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export function normalizeCustomAllocationQuestionType(rawType: string): CustomAllocationQuestionType | null {
  const normalized = rawType.trim().toLowerCase().replaceAll("_", "-");
  if (normalized === "multiple-choice") {
    return "multiple-choice";
  }
  if (normalized === "rating") {
    return "rating";
  }
  if (normalized === "slider") {
    return "slider";
  }
  return null;
}

function cleanupExpiredCustomAllocationPreviews(referenceTime = Date.now()) {
  for (const [previewId, preview] of customAllocationPreviewCache.entries()) {
    if (preview.expiresAt.getTime() <= referenceTime) {
      customAllocationPreviewCache.delete(previewId);
    }
  }
}

export function getCustomAllocationResponseThreshold() {
  const rawThreshold = process.env.CUSTOM_ALLOCATION_RESPONSE_THRESHOLD;
  const parsedThreshold = Number(rawThreshold);
  if (!Number.isFinite(parsedThreshold)) {
    return DEFAULT_CUSTOM_ALLOCATION_RESPONSE_THRESHOLD;
  }
  return Math.min(100, Math.max(0, Number(parsedThreshold.toFixed(2))));
}

export function storeCustomAllocationPreview(preview: StoredCustomAllocationPreview) {
  cleanupExpiredCustomAllocationPreviews(preview.generatedAt.getTime());
  customAllocationPreviewCache.set(preview.previewId, preview);
}

export function getStoredCustomAllocationPreview(
  previewId: string,
  staffId: number,
  projectId: number,
): StoredCustomAllocationPreview | null {
  cleanupExpiredCustomAllocationPreviews();
  const preview = customAllocationPreviewCache.get(previewId);
  if (!preview) {
    return null;
  }
  if (preview.staffId !== staffId || preview.projectId !== projectId) {
    return null;
  }
  return preview;
}

export function parseCustomAllocationAnswers(answersJson: unknown): Map<number, unknown> {
  const answersByQuestionId = new Map<number, unknown>();

  if (Array.isArray(answersJson)) {
    for (const answerItem of answersJson) {
      if (!answerItem || typeof answerItem !== "object") {
        continue;
      }

      const row = answerItem as Record<string, unknown>;
      const rawQuestionId = row.questionId ?? row.question;
      const questionId = Number(rawQuestionId);
      if (!Number.isInteger(questionId) || questionId < 1) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(row, "answer")) {
        continue;
      }

      answersByQuestionId.set(questionId, row.answer);
    }
    return answersByQuestionId;
  }

  if (!answersJson || typeof answersJson !== "object") {
    return answersByQuestionId;
  }

  for (const [rawQuestionId, answer] of Object.entries(answersJson as Record<string, unknown>)) {
    const questionId = Number(rawQuestionId);
    if (!Number.isInteger(questionId) || questionId < 1) {
      continue;
    }
    answersByQuestionId.set(questionId, answer);
  }

  return answersByQuestionId;
}

export function resolveCustomAllocationTeamNames(
  previewTeams: Array<{ suggestedName: string }>,
  teamNames?: string[],
): string[] {
  const defaults = previewTeams.map((team, index) => {
    const fallbackName = `Custom Team ${index + 1}`;
    const normalized = team.suggestedName.trim();
    return normalized.length > 0 ? normalized : fallbackName;
  });

  if (teamNames === undefined) {
    return defaults;
  }

  if (!Array.isArray(teamNames) || teamNames.length !== previewTeams.length) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const normalizedNames = teamNames.map((teamName) => teamName.trim());
  if (normalizedNames.some((teamName) => teamName.length === 0)) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const uniqueNames = new Set(normalizedNames.map((teamName) => teamName.toLowerCase()));
  if (uniqueNames.size !== normalizedNames.length) {
    throw { code: "DUPLICATE_TEAM_NAMES" };
  }

  return normalizedNames;
}

export function findStaleStudentsFromPreview(
  previewTeams: StoredCustomPreviewTeam[],
  currentlyVacantStudentIds: Set<number>,
): CustomAllocationStaleStudent[] {
  const staleById = new Map<number, CustomAllocationStaleStudent>();
  for (const team of previewTeams) {
    for (const member of team.members) {
      if (currentlyVacantStudentIds.has(member.id)) {
        continue;
      }
      if (staleById.has(member.id)) {
        continue;
      }
      staleById.set(member.id, {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
      });
    }
  }
  return Array.from(staleById.values());
}

export function deleteCustomAllocationPreview(previewId: string) {
  customAllocationPreviewCache.delete(previewId);
}