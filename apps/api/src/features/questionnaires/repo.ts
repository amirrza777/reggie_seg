import { prisma } from "../../shared/db"
import { IncomingQuestion } from "./types";

export function createQuestionnaireTemplate(
  templateName: string,
  questions: any[]
) {
  return prisma.questionnaireTemplate.create({
    data: {
      templateName,
      questions: {
        create: questions.map((q, index) => ({
          label: q.text,
          type: q.type,
          order: index,
          configs: q.configs ?? null,
        })),
      },
    },
  })
}

export function getQuestionnaireTemplateById(id: number) {
  return prisma.questionnaireTemplate.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  })
}

export async function updateQuestionnaireTemplate(
  templateId: number,
  templateName: string,
  questions: IncomingQuestion[]
) {
    //update in transaction so no data is lost if error occurs
  return prisma.$transaction(async (tx) => {
    await tx.questionnaireTemplate.update({
      where: { id: templateId },
      data: { templateName },
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

    //Updates existing questions
    for (const q of toUpdate) {
      await tx.question.update({
        where: { id: q.id! },
        data: {
          label: q.text,
          type: q.type,
          configs: q.configs ?? null,
          order: questions.indexOf(q),
        },
      });
    }

    //Creates new questions
    if (toCreate.length > 0) {
      await tx.question.createMany({
        data: toCreate.map((q) => ({
          templateId,
          label: q.text,
          type: q.type,
          order: questions.indexOf(q),
          configs: q.configs ?? null,
        })),
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

export function deleteQuestionnaireTemplate(id: number) {
  return prisma.questionnaireTemplate.delete({
    where: { id },
  });
}

