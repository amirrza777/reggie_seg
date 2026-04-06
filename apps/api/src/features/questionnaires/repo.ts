import { prisma } from "../../shared/db.js";
import { Prisma } from "@prisma/client";
import type { IncomingQuestion, QuestionnairePurpose } from "./types.js";
import { matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import { applyFuzzyFallback } from "../../shared/fuzzyFallback.js";
import { getMyQuestionnaireTemplatesImpl } from "./repo.getMyQuestionnaireTemplates.impl.js";

function matchesTemplateSearchQuery(
  template: { id: number; templateName: string; questions?: Array<{ label: string }> },
  query: string,
): boolean {
  return matchesFuzzySearchCandidate({
    query,
    candidateId: template.id,
    sources: [template.templateName, ...(template.questions ?? []).map((question) => question.label)],
  });
}

function toQuestionConfigsValue(configs: unknown): Prisma.InputJsonValue {
  return (configs ?? null) as Prisma.InputJsonValue;
}

/** Creates a questionnaire template. */
export function createQuestionnaireTemplate(
  templateName: string,
  questions: IncomingQuestion[],
  userId: number,
  isPublic: boolean,
  purpose?: QuestionnairePurpose,
) {
  return prisma.questionnaireTemplate.create({
    data: {
      templateName,
      isPublic,
      ...(purpose !== undefined ? { purpose } : {}),
      questions: {
        create: questions.map((q, index) => ({
          label: q.label,
          type: q.type,
          order: index,
          configs: toQuestionConfigsValue(q.configs),
        })),
      },
      ownerId: userId,
    },
  })
}

/** Returns the questionnaire template by ID. */
export function getQuestionnaireTemplateById(id: number, requesterUserId?: number | null) {
  return prisma.questionnaireTemplate.findFirst({
    where: requesterUserId
      ? { id, OR: [{ isPublic: true }, { ownerId: requesterUserId }] }
      : { id, isPublic: true },
    include: { questions: { orderBy: { order: "asc" } } },
  })
}

/** Returns the all questionnaire templates. */
export function getAllQuestionnaireTemplates(requesterUserId?: number | null) {
  return prisma.questionnaireTemplate.findMany({
    where: requesterUserId
      ? { OR: [{ isPublic: true }, { ownerId: requesterUserId }] }
      : { isPublic: true },
    include: { questions: { orderBy: { order: "asc" } } },
  });
};

/** Returns the my questionnaire templates. */
export async function getMyQuestionnaireTemplates(
  userId: number,
  options?: { query?: string | null; purpose?: QuestionnairePurpose },
) {
  return getMyQuestionnaireTemplatesImpl({
    userId,
    options,
    prisma,
    parsePositiveIntegerSearchQuery,
    applyFuzzyFallback,
    matchesTemplateSearchQuery,
  });
}

/** Returns the public questionnaire templates by other users. */
export function getPublicQuestionnaireTemplatesByOtherUsers(
  userId: number,
  options?: { purpose?: QuestionnairePurpose },
) {
  return prisma.questionnaireTemplate.findMany({
    where: {
      isPublic: true,
      ownerId: { not: userId },
      ...(options?.purpose !== undefined ? { purpose: options.purpose } : {}),
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });
}

/** Checks whether questionnaire template owned by user. */
export async function isQuestionnaireTemplateOwnedByUser(templateId: number, userId: number) {
  const template = await prisma.questionnaireTemplate.findFirst({
    where: { id: templateId, ownerId: userId },
    select: { id: true },
  });
  return Boolean(template);
}

/** Checks whether questionnaire template in use. */
export async function isQuestionnaireTemplateInUse(templateId: number) {
  const template = await prisma.questionnaireTemplate.findUnique({
    where: { id: templateId },
    select: {
      _count: {
        select: {
          projects: true,
          assessments: true,
        },
      },
    },
  });

  if (!template) return false;
  return template._count.projects > 0 || template._count.assessments > 0;
}

/** Updates the questionnaire template. */
export async function updateQuestionnaireTemplate(
  templateId: number,
  templateName: string,
  questions: IncomingQuestion[],
  isPublic?: boolean,
  purpose?: QuestionnairePurpose,
) {
  //update in transaction so no data is lost if error occurs
  return prisma.$transaction(async (tx) => {
    await tx.questionnaireTemplate.update({
      where: { id: templateId },
      data: {
        templateName,
        ...(typeof isPublic === "boolean" ? { isPublic } : {}),
        ...(purpose !== undefined ? { purpose } : {}),
      },
    });

    const existingQuestions = await tx.question.findMany({
      where: { templateId },
      select: { id: true },
    });

    const existingIds = existingQuestions.map((q) => q.id);

    //Separates incoming questions
    const toUpdate = questions.filter(
      (q) => q.id && existingIds.includes(q.id)
    );
    const toCreate = questions.filter((q) => !q.id);
    const toDeleteIds = existingIds.filter(
      (id) => !toUpdate.some((q) => q.id === id)
    );

    const incomingOrderById = new Map<number, number>();
    const incomingOrderByRef = new Map<IncomingQuestion, number>();
    questions.forEach((q, idx) => {
      incomingOrderByRef.set(q, idx);
      if (typeof q.id === "number") incomingOrderById.set(q.id, idx);
    });

    //Updates existing questions
    for (const q of toUpdate) {
      await tx.question.update({
        where: { id: q.id! },
        data: {
          label: q.label,
          type: q.type,
          configs: q.configs ?? Prisma.JsonNull,
          order: incomingOrderById.get(q.id!) ?? 0,
        },
      });
    }

    //Creates new questions
    if (toCreate.length > 0) {
      const createData = toCreate.map((q) => {
        const order = incomingOrderByRef.get(q);
        return {
          templateId,
          label: q.label,
          type: q.type,
          order: typeof order === "number" ? order : 0,
          configs: q.configs ?? Prisma.JsonNull,
        };
      });

      await tx.question.createMany({
        data: createData,
      });
    }

    //Deletes removed questions
    if (toDeleteIds.length > 0) {
      await tx.question.deleteMany({
        where: { id: { in: toDeleteIds } },
      });
    }
  });
}

/** Deletes the questionnaire template. */
export function deleteQuestionnaireTemplate(id: number) {
  return prisma.questionnaireTemplate.delete({
    where: { id },
  });
}

/** Executes the copy public questionnaire template to user. */
export async function copyPublicQuestionnaireTemplateToUser(templateId: number, userId: number) {
  const source = await prisma.questionnaireTemplate.findFirst({
    where: { id: templateId, isPublic: true },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!source) return null;

  return prisma.questionnaireTemplate.create({
    data: {
      templateName: `${source.templateName} (Copy)`,
      isPublic: false,
      purpose: (source as { purpose?: QuestionnairePurpose }).purpose ?? "GENERAL_PURPOSE",
      ownerId: userId,
      questions: {
        create: source.questions.map((q, index) => ({
          label: q.label,
          type: q.type as Prisma.QuestionCreateWithoutTemplateInput["type"],
          order: index,
          configs: toQuestionConfigsValue(q.configs),
        })),
      },
    },
    select: { id: true },
  });
}
