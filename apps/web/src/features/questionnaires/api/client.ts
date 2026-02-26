import { apiFetch } from "@/shared/api/http";
import type { QuestionConfigs, QuestionType, Questionnaire } from "../types";

export async function getMyQuestionnaires(): Promise<Questionnaire[]> {
  return apiFetch("/questionnaires/mine");
}

export async function getPublicQuestionnairesFromOthers(): Promise<Questionnaire[]> {
  return apiFetch("/questionnaires/public/others");
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
  isPublic: boolean;
  questions: QuestionnaireMutationQuestion[];
};

export async function createQuestionnaire(payload: QuestionnaireMutationPayload) {
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
