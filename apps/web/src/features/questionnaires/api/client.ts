import { apiFetch } from "@/shared/api/http"
import {
  CreateQuestionnaireInput,
  UpdateQuestionnaireInput,
  Questionnaire,
} from "../types"

export function createQuestionnaire(data: CreateQuestionnaireInput) {
  return apiFetch<Questionnaire>("/questionnaires", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateQuestionnaire(
  id: string,
  data: UpdateQuestionnaireInput
) {
  return apiFetch<Questionnaire>(`/questionnaires/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export function deleteQuestionnaire(id: string) {
  return apiFetch<void>(`/questionnaires/${id}`, {
    method: "DELETE",
  })
}
