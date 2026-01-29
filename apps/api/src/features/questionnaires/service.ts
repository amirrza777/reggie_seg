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
  questions: Question[]
) {
  return createQuestionnaireTemplate(templateName, questions)
}

export function getTemplate(id: number) {
  return getQuestionnaireTemplateById(id)
}

export function getAllTemplates() {
    return getAllQuestionnaireTemplates();
}

export function updateTemplate(
  templateId: number,
  templateName: string,
  questions: IncomingQuestion[]
) {
  return updateQuestionnaireTemplate(templateId, templateName, questions);
}

export function deleteTemplate(templateId: number) {
  return deleteQuestionnaireTemplate(templateId);
}

