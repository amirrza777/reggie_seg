import { apiFetch } from "@/shared/api/http";
import type {
  QuestionConfigs,
  QuestionType,
  Questionnaire,
  QuestionnairePurpose,
} from "../types";

export async function getMyQuestionnaires(options?: {
  query?: string;
  purpose?: QuestionnairePurpose;
}): Promise<Questionnaire[]> {
  const searchParams = new URLSearchParams();
  if (options?.query?.trim()) {
    searchParams.set("q", options.query.trim());
  }
  if (options?.purpose) {
    searchParams.set("purpose", options.purpose);
  }
  const query = searchParams.toString();
  const path = query ? `/questionnaires/mine?${query}` : "/questionnaires/mine";
  return apiFetch(path);
}

export async function getPublicQuestionnairesFromOthers(options?: {
  purpose?: QuestionnairePurpose;
}): Promise<Questionnaire[]> {
  const query = options?.purpose ? `?purpose=${encodeURIComponent(options.purpose)}` : "";
  return apiFetch(`/questionnaires/public/others${query}`);
}

export async function getQuestionnaireById(templateId: number | string): Promise<Questionnaire> {
  return apiFetch(`/questionnaires/${templateId}`);
}

type QuestionnaireMutationQuestion = {
  id?: number;
  label: string;
  type: QuestionType;
  configs?: QuestionConfigs;
};

type QuestionnaireMutationPayload = {
  templateName: string;
  purpose: QuestionnairePurpose;
  isPublic: boolean;
  questions: QuestionnaireMutationQuestion[];
};

export async function createQuestionnaire(
  payload: QuestionnaireMutationPayload
): Promise<{ ok: true; templateID: number; userId: number; isPublic: boolean }> {
  return apiFetch("/questionnaires/new", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQuestionnaire(
  templateId: number | string,
  payload: QuestionnaireMutationPayload
) {
  return apiFetch(`/questionnaires/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteQuestionnaire(templateId: number | string) {
  return apiFetch(`/questionnaires/${templateId}`, {
    method: "DELETE",
  });
}

export async function usePublicQuestionnaire(templateId: number | string): Promise<{ ok: true; templateID: number }> {
  return apiFetch(`/questionnaires/${templateId}/use`, {
    method: "POST",
  });
}
