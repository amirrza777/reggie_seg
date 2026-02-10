import { prisma } from "../../shared/db.js";

export async function upsertPeerFeedback(data: {
  peerAssessmentId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  reviewText?: string | null;
  agreementsJson: any;
}) {
  // Get the team ID from the peer assessment
  const assessment = await prisma.peerAssessment.findUnique({
    where: { id: data.peerAssessmentId },
    select: { teamId: true },
  });

  if (!assessment) {
    throw new Error("Peer assessment not found");
  }

  return prisma.peerFeedback.upsert({
    where: { peerAssessmentId: data.peerAssessmentId },
    update: {
      reviewerUserId: data.reviewerUserId,
      revieweeUserId: data.revieweeUserId,
      reviewText: data.reviewText ?? null,
      agreementsJson: data.agreementsJson,
      updatedAt: new Date(),
    },
    create: {
      peerAssessmentId: data.peerAssessmentId,
      teamId: assessment.teamId,
      reviewerUserId: data.reviewerUserId,
      revieweeUserId: data.revieweeUserId,
      reviewText: data.reviewText ?? null,
      agreementsJson: data.agreementsJson,
    },
    include: {
      peerAssessment: {
        select: {
          id: true,
          reviewerUserId: true,
          revieweeUserId: true,
          projectId: true,
          answersJson: true,
          questionnaireTemplate: {
            select: {
              questions: {
                select: {
                  id: true,
                  label: true,
                  order: true,
                },
              },
            },
          },
          reviewee: { select: { firstName: true, lastName: true } },
          reviewer: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

export function getPeerFeedbackByAssessmentId(peerAssessmentId: number) {
  return prisma.peerFeedback.findUnique({
    where: { peerAssessmentId },
    include: {
      peerAssessment: {
        select: {
          id: true,
          reviewerUserId: true,
          revieweeUserId: true,
          projectId: true,
          answersJson: true,
          questionnaireTemplate: {
            select: {
              questions: {
                select: {
                  id: true,
                  label: true,
                  order: true,
                },
              },
            },
          },
          reviewee: { select: { firstName: true, lastName: true } },
          reviewer: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

export function getPeerAssessmentById(assessmentId: number) {
  return prisma.peerAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      reviewee: {
        select: { id: true, firstName: true, lastName: true },
      },
      questionnaireTemplate: {
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
}
