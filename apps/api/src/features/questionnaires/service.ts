import {
  createQuestionnaireTemplate,
  getQuestionnaireTemplateById,
  getAllQuestionnaireTemplates,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate
} from "./repo"
import { IncomingQuestion } from "./types";

export async function createTemplate(
  templateName: string,
  questions: any[]
) {
  return createQuestionnaireTemplate(templateName, questions)
}

export async function getTemplate(id: number) {
  return getQuestionnaireTemplateById(id)
}

export const getAllTemplates = async () => {
  return prisma.questionnaireTemplate.findMany({
    include: { questions: true },
  });
};

export async function updateTemplate(
  templateId: number,
  templateName: string,
  questions: IncomingQuestion[]
) {
  return updateQuestionnaireTemplate(templateId, templateName, questions);
}

export async function deleteTemplate(templateId: number) {
  return deleteQuestionnaireTemplate(templateId);
}

