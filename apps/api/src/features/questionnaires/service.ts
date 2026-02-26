import {
  createQuestionnaireTemplate,
  getQuestionnaireTemplateById,
  getAllQuestionnaireTemplates,
  getMyQuestionnaireTemplates,
  getPublicQuestionnaireTemplatesByOtherUsers,
  isQuestionnaireTemplateOwnedByUser,
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

export function getMyTemplates(userId: number) {
  return getMyQuestionnaireTemplates(userId);
}

export function getPublicTemplatesFromOtherUsers(userId: number) {
  return getPublicQuestionnaireTemplatesByOtherUsers(userId);
}

export function updateTemplate(
  requesterUserId: number,
  templateId: number,
  templateName: string,
  questions: IncomingQuestion[],
  isPublic?: boolean
) {
  if (!requesterUserId) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return isQuestionnaireTemplateOwnedByUser(templateId, requesterUserId).then((isOwner) => {
    if (!isOwner) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }
    return updateQuestionnaireTemplate(templateId, templateName, questions, isPublic);
  });
}

export function deleteTemplate(requesterUserId: number, templateId: number) {
  if (!requesterUserId) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return isQuestionnaireTemplateOwnedByUser(templateId, requesterUserId).then((isOwner) => {
    if (!isOwner) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }
    return deleteQuestionnaireTemplate(templateId);
  });
}

