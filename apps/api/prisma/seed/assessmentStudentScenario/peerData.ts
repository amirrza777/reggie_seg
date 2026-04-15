import { buildAgreementPayload, buildFeedbackText } from "../completed-project/helpers";
import { buildPeerAssessmentAnswersJsonForSeed } from "../peerAssessmentScenario/assessments";
import { prisma } from "../prismaClient";
import type { AssessmentStudentProjectState } from "./constants";
import type { AssessmentStudentScenarioProject } from "./setup";

export async function seedAssessmentStudentPeerData(
  projects: AssessmentStudentScenarioProject[],
  memberIds: number[],
  questionLabels: string[],
) {
  let assessments = 0;
  let feedbacks = 0;
  for (const project of projects) {
    await clearProjectPeerData(project);
    if (project.state === "upcoming" || project.state === "assessment-open") continue;
    const seeded = await seedProjectPeerData(project, memberIds, questionLabels);
    assessments += seeded.assessments;
    feedbacks += seeded.feedbacks;
  }
  return { assessments, feedbacks };
}

async function clearProjectPeerData(project: AssessmentStudentScenarioProject) {
  await prisma.peerFeedback.deleteMany({ where: { teamId: project.teamId } });
  await prisma.peerAssessment.deleteMany({ where: { projectId: project.id, teamId: project.teamId } });
}

async function seedProjectPeerData(
  project: AssessmentStudentScenarioProject,
  memberIds: number[],
  questionLabels: string[],
) {
  let assessments = 0;
  let feedbacks = 0;
  const feedbackLimit = getFeedbackLimit(project.state, memberIds.length);
  for (const reviewerId of memberIds) {
    for (const revieweeId of memberIds) {
      if (reviewerId === revieweeId) continue;
      const assessment = await createAssessment(project, reviewerId, revieweeId, questionLabels);
      assessments += 1;
      if (feedbacks < feedbackLimit) {
        await createFeedback(project.teamId, assessment.id, reviewerId, revieweeId, questionLabels);
        feedbacks += 1;
      }
    }
  }
  return { assessments, feedbacks };
}

function getFeedbackLimit(state: AssessmentStudentProjectState, memberCount: number) {
  const allPairs = memberCount * Math.max(0, memberCount - 1);
  if (state === "feedback-pending") return Math.max(1, Math.floor(allPairs / 2));
  return allPairs;
}

async function createAssessment(
  project: AssessmentStudentScenarioProject,
  reviewerUserId: number,
  revieweeUserId: number,
  questionLabels: string[],
) {
  const answersJson = await buildPeerAssessmentAnswersJsonForSeed(
    project.templateId,
    questionLabels,
    ({ label }) => `Reviewer ${reviewerUserId} rated teammate ${revieweeUserId} for ${label}.`,
  );
  return prisma.peerAssessment.create({
    data: {
      projectId: project.id,
      teamId: project.teamId,
      reviewerUserId,
      revieweeUserId,
      templateId: project.templateId,
      answersJson,
      submittedLate: false,
    },
    select: { id: true },
  });
}

function createFeedback(teamId: number, assessmentId: number, reviewerUserId: number, revieweeUserId: number, questionLabels: string[]) {
  return prisma.peerFeedback.create({
    data: {
      teamId,
      peerAssessmentId: assessmentId,
      reviewerUserId,
      revieweeUserId,
      reviewText: buildFeedbackText(reviewerUserId, revieweeUserId),
      agreementsJson: buildAgreementPayload(reviewerUserId, revieweeUserId, questionLabels),
      submittedLate: false,
    },
  });
}
