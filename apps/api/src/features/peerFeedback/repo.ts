import { prisma } from "../../shared/db.js";

/** Executes the upsert peer feedback. */
export async function upsertPeerFeedback(data: {
  peerAssessmentId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  reviewText?: string | null;
  agreementsJson: any;
  submittedLate?: boolean;
  effectiveDueDate?: Date | null;
}) {
  // Get the team ID from the peer assessment
  const assessment = await prisma.peerAssessment.findUnique({
    where: { id: data.peerAssessmentId },
    select: { teamId: true },
  });

  if (!assessment) {
    throw new Error("Peer assessment not found");
  }

  const updateData: Record<string, unknown> = {
    reviewerUserId: data.reviewerUserId,
    revieweeUserId: data.revieweeUserId,
    reviewText: data.reviewText ?? null,
    agreementsJson: data.agreementsJson,
    updatedAt: new Date(),
  };
  if (data.submittedLate === true) {
    updateData.submittedLate = true;
  }
  if ("effectiveDueDate" in data) {
    updateData.effectiveDueDate = data.effectiveDueDate ?? null;
  }

  return prisma.peerFeedback.upsert({
    where: { peerAssessmentId: data.peerAssessmentId },
    update: updateData,
    create: {
      peerAssessmentId: data.peerAssessmentId,
      teamId: assessment.teamId,
      reviewerUserId: data.reviewerUserId,
      revieweeUserId: data.revieweeUserId,
      reviewText: data.reviewText ?? null,
      agreementsJson: data.agreementsJson,
      submittedLate: data.submittedLate ?? false,
      effectiveDueDate: data.effectiveDueDate ?? null,
    },
    include: {
      peerAssessment: {
        select: {
          id: true,
          templateId: true,
          reviewerUserId: true,
          revieweeUserId: true,
          projectId: true,
          answersJson: true,
          questionnaireTemplate: {
            select: {
              id: true,
              questions: {
                select: {
                  id: true,
                  label: true,
                  type: true,
                  order: true,
                  configs: true,
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

/** Returns the peer feedback by assessment ID. */
export function getPeerFeedbackByAssessmentId(peerAssessmentId: number) {
  return prisma.peerFeedback.findUnique({
    where: { peerAssessmentId },
    include: {
      peerAssessment: {
        select: {
          id: true,
          templateId: true,
          reviewerUserId: true,
          revieweeUserId: true,
          projectId: true,
          answersJson: true,
          questionnaireTemplate: {
            select: {
              id: true,
              questions: {
                select: {
                  id: true,
                  label: true,
                  type: true,
                  order: true,
                  configs: true,
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

/** Returns existing peer feedback assessment ids for bulk status lookups. */
export function getPeerFeedbackByAssessmentIds(peerAssessmentIds: number[]) {
  return prisma.peerFeedback.findMany({
    where: {
      peerAssessmentId: {
        in: peerAssessmentIds,
      },
    },
    select: {
      peerAssessmentId: true,
    },
  });
}

/** Returns the peer assessment by ID. */
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
