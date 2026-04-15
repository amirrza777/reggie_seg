import { buildPeerAssessmentAnswersJsonForSeed } from "../peerAssessmentScenario/assessments";
import { prisma } from "../prismaClient";

function buildAssessmentAnswer(label: string, reviewerId: number, revieweeId: number) {
  const selector = (reviewerId + revieweeId + label.length) % 3;
  if (selector === 0) return "Consistently contributed and communicated blockers early.";
  if (selector === 1) return "Reliable ownership of tasks and steady delivery updates.";
  return "Helpful collaborator with clear handovers and good meeting engagement.";
}

export async function getTemplateQuestionLabels(templateId: number) {
  const rows = await prisma.question.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    select: { label: true },
  });
  if (rows.length > 0) return rows.map((row) => row.label);
  return ["Overall contribution"];
}

export async function seedPartialPeerAssessments(
  projectId: number,
  teamId: number,
  templateId: number,
  memberIds: number[],
) {
  await prisma.peerFeedback.deleteMany({ where: { teamId } });
  await prisma.peerAssessment.deleteMany({ where: { projectId, teamId } });

  let created = 0;

  for (let index = 0; index < memberIds.length; index += 1) {
    const reviewerUserId = memberIds[index];
    const revieweeUserId = memberIds[(index + 1) % memberIds.length];
    if (!reviewerUserId || !revieweeUserId || reviewerUserId === revieweeUserId) continue;

    const answersJson = await buildPeerAssessmentAnswersJsonForSeed(
      templateId,
      [],
      ({ label }) => buildAssessmentAnswer(label, reviewerUserId, revieweeUserId),
    );

    await prisma.peerAssessment.create({
      data: {
        projectId,
        teamId,
        reviewerUserId,
        revieweeUserId,
        templateId,
        answersJson,
        submittedLate: false,
      },
    });
    created += 1;
  }

  return created;
}
