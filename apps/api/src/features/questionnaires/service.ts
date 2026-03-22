import {
  createQuestionnaireTemplate,
  copyPublicQuestionnaireTemplateToUser,
  getQuestionnaireTemplateById,
  getAllQuestionnaireTemplates,
  getMyQuestionnaireTemplates,
  getPublicQuestionnaireTemplatesByOtherUsers,
  isQuestionnaireTemplateOwnedByUser,
  isQuestionnaireTemplateInUse,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate
} from "./repo.js"
import type { IncomingQuestion, Question } from "./types.js";

async function ensureTemplateOwnership(requesterUserId: number, templateId: number) {
  if (!requesterUserId) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  const isOwner = await isQuestionnaireTemplateOwnedByUser(templateId, requesterUserId);
  if (!isOwner) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
}

/** Creates a template. */
export function createTemplate(
  templateName: string,
  questions: Question[],
  userId: number,
  isPublic: boolean
) {
  return createQuestionnaireTemplate(templateName, questions, userId, isPublic)
}

/** Returns the template. */
export function getTemplate(id: number, requesterUserId?: number | null) {
  return getQuestionnaireTemplateById(id, requesterUserId)
}

/** Returns the all templates. */
export function getAllTemplates(requesterUserId?: number | null) {
    return getAllQuestionnaireTemplates(requesterUserId);
}

/** Returns the my templates. */
export function getMyTemplates(userId: number, options?: { query?: string | null }) {
  if (options?.query) {
    return getMyQuestionnaireTemplates(userId, options);
  }
  return getMyQuestionnaireTemplates(userId);
}

/** Returns the public templates from other users. */
export function getPublicTemplatesFromOtherUsers(userId: number) {
  return getPublicQuestionnaireTemplatesByOtherUsers(userId);
}

/** Updates the template. */
export function updateTemplate(
  requesterUserId: number,
  templateId: number,
  templateName: string,
  questions: IncomingQuestion[],
  isPublic?: boolean
) {
  return ensureTemplateOwnership(requesterUserId, templateId).then(() =>
    updateQuestionnaireTemplate(templateId, templateName, questions, isPublic)
  );
}

/** Deletes the template. */
export function deleteTemplate(requesterUserId: number, templateId: number) {
  return ensureTemplateOwnership(requesterUserId, templateId).then(async () => {
    const inUse = await isQuestionnaireTemplateInUse(templateId);
    if (inUse) {
      throw Object.assign(
        new Error("Cannot delete questionnaire template because it is currently in use."),
        { code: "TEMPLATE_IN_USE" }
      );
    }

    return deleteQuestionnaireTemplate(templateId);
  });
}

/** Executes the use public template. */
export function usePublicTemplate(requesterUserId: number, templateId: number) {
  if (!requesterUserId) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return copyPublicQuestionnaireTemplateToUser(templateId, requesterUserId);
}
