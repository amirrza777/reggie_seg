import {
  createQuestionnaireTemplate,
  getQuestionnaireTemplateById,
  getAllQuestionnaireTemplates,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate
} from "./repo.js"
import type { IncomingQuestion, Question } from "./types.js";

export function createTemplate(
  templateName: string,
  questions: Question[],
  userId: number,
  isPublic: boolean
) {
  return createQuestionnaireTemplate(templateName, questions, userId, isPublic)
}

export function getTemplate(id: number, requesterUserId?: number | null) {
  return getQuestionnaireTemplateById(id, requesterUserId)
}

export function getAllTemplates(requesterUserId?: number | null) {
    return getAllQuestionnaireTemplates(requesterUserId);
}

export function updateTemplate(
  templateId: number,
  templateName: string,
  questions: IncomingQuestion[],
  isPublic?: boolean
) {
  return updateQuestionnaireTemplate(templateId, templateName, questions, isPublic);
}

export function deleteTemplate(templateId: number) {
  return deleteQuestionnaireTemplate(templateId);
}

