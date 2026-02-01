import { apiFetch } from "@/shared/api/http";
import { Questionnaire, Question } from "../types";

export async function getAllQuestionnaires(): Promise<Questionnaire[]> {
  return apiFetch("/questionnaires");
}

export async function createQuestionnaire(templateName: string, questions: Question[]) {
  return apiFetch("/questionnaires/new", {
    method: "POST",
    body: JSON.stringify({ templateName, questions }),
  });
}

export async function updateQuestionnaire(templateId: number, templateName: string, questions: Question[]) {
  return apiFetch(`/questionnaires/${templateId}`, {
    method: "PUT",
    body: JSON.stringify({ templateName, questions }),
  });
}

export async function deleteQuestionnaire(templateId: number) {
  return apiFetch(`/questionnaires/${templateId}`, {
    method: "DELETE",
  });
}
