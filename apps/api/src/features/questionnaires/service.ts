import {
  createQuestionnaireTemplate,
  getQuestionnaireTemplateById,
  getAllQuestionnaireTemplates,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate
} from "./repo"
import { Question } from "./types";

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
  questions: Question[]
) {
  return updateQuestionnaireTemplate(templateId, templateName, questions);
}

export function deleteTemplate(templateId: number) {
  return deleteQuestionnaireTemplate(templateId);
}

