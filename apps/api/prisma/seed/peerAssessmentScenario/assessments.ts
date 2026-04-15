import { prisma } from "../prismaClient";

function buildAssessmentAnswer(label: string, reviewerId: number, revieweeId: number) {
  const tone = (reviewerId + revieweeId + label.length) % 3;
  if (tone === 0) return "Consistent contribution throughout delivery with clear ownership of tasks.";
  if (tone === 1) return "Good delivery pace and reliable collaboration during implementation and review.";
  return "Steady engagement and helpful communication across planning, coding, and team check-ins.";
}

export type PeerSeedAnswerContext = { label: string; questionIndex: number };

export async function buildPeerAssessmentAnswersJsonForSeed(
  templateId: number,
  fallbackLabels: string[],
  buildAnswer: (ctx: PeerSeedAnswerContext) => string | number | boolean | null,
): Promise<Record<string, string | number | boolean | null>> {
  const rows = await prisma.question.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    select: { id: true, label: true },
  });
  if (rows.length > 0) {
    return Object.fromEntries(
      rows.map((row, questionIndex) => [
        String(row.id),
        buildAnswer({ label: row.label, questionIndex }),
      ]),
    );
  }
  const labels = fallbackLabels.length > 0 ? fallbackLabels : ["Overall contribution"];
  return Object.fromEntries(
    labels.map((label, questionIndex) => [label, buildAnswer({ label, questionIndex })]),
  );
}

export async function getTemplateQuestionLabels(templateId: number, fallback: string[]) {
  const rows = await prisma.question.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    select: { label: true },
  });
  if (rows.length > 0) {
    return rows.map((row) => row.label);
  }
  if (fallback.length > 0) return fallback;
  return ["Overall contribution"];
}

export function clearScenarioPeerData(projectId: number, teamId: number) {
  return Promise.all([
    prisma.peerFeedback.deleteMany({ where: { teamId } }),
    prisma.peerAssessment.deleteMany({ where: { projectId, teamId } }),
  ]);
}

async function upsertScenarioAssessment(
  projectId: number,
  teamId: number,
  templateId: number,
  reviewerUserId: number,
  revieweeUserId: number,
  questionLabels: string[],
) {
  const answersJson = await buildPeerAssessmentAnswersJsonForSeed(
    templateId,
    questionLabels,
    ({ label }) => buildAssessmentAnswer(label, reviewerUserId, revieweeUserId),
  );
  return prisma.peerAssessment.upsert({
    where: {
      projectId_teamId_reviewerUserId_revieweeUserId: { projectId, teamId, reviewerUserId, revieweeUserId },
    },
    update: { templateId, answersJson, submittedLate: false, effectiveDueDate: null },
    create: { projectId, teamId, reviewerUserId, revieweeUserId, templateId, answersJson, submittedLate: false },
  });
}

export async function upsertScenarioAssessments(
  projectId: number,
  teamId: number,
  templateId: number,
  memberIds: number[],
  questionLabels: string[],
) {
  let count = 0;
  for (const reviewerUserId of memberIds) {
    for (const revieweeUserId of memberIds) {
      if (reviewerUserId === revieweeUserId) continue;
      await upsertScenarioAssessment(projectId, teamId, templateId, reviewerUserId, revieweeUserId, questionLabels);
      count += 1;
    }
  }
  return count;
}
