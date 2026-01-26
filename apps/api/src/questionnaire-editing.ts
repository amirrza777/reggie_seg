import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

type IncomingQuestion = {
  id?: number;       //edits if existing, or creates new
  text: string;
  type: string;
  configs?: unknown;
};

router.put("/:id", async (req, res) => {
  const templateId = Number(req.params.id);
  const {templateName, questions} = req.body as {
    templateName: string;
    questions: IncomingQuestion[];
  };

  if (isNaN(templateId)) {
    return res.status(400).json({ error: "Invalid questionnaire template ID" });
  }
  if (!templateName || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    //update in transaction so no data is lost if error occurs
    await prisma.$transaction(async (prisma) => {

      await prisma.questionnaireTemplate.update({
        where: { id: templateId },
        data: { templateName },
      });

      const existingQuestions = await prisma.question.findMany({
        where: { templateId },
        select: { id: true },
      });
      const existingIds = existingQuestions.map((q) => q.id);

      //Separates incoming questions
      const toUpdate = questions.filter((q) => q.id && existingIds.includes(q.id));
      const toCreate = questions.filter((q) => !q.id);
      const toDeleteIds = existingIds.filter((id) => !toUpdate.some((q) => q.id === id));

      //Updates existing questions
      for (const q of toUpdate) {
        await prisma.question.update({
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
        await prisma.question.createMany({
          data: toCreate.map((q, index) => ({
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
        await prisma.question.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }
    });

    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Questionnaire template not found" });
    }
    console.error("Error updating questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Delete questionnaire template
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid questionnaire template ID' });

  try {
    await prisma.questionnaireTemplate.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Questionnaire template not found' });
    }
    console.error('Error deleting questionnaire template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
