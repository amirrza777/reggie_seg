import { prisma } from "../../shared/db.js";

export function getTeammates(userId: number, teamId: number) {
  return prisma.teamAllocation.findMany({
    where: {
      teamId: teamId,
      userId: { not: userId },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

export function createPeerAssessment(data: {
  moduleId: number;
  projectId: number | null;
  teamId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  templateId: number;
  answersJson: any;
}) {
  return prisma.peerAssessment.create({
    data: {
      moduleId: data.moduleId,
      projectId: data.projectId,
      teamId: data.teamId,
      reviewerUserId: data.reviewerUserId,
      revieweeUserId: data.revieweeUserId,
      questionnaireTemplateId: data.templateId,
      templateId: data.templateId,
      answersJson: data.answersJson,
    },
  });
}

export function getPeerAssessment(
  moduleId: number,
  projectId: number | null,
  teamId: number,
  reviewerId: number,
  revieweeId: number,
) {
  return prisma.peerAssessment.findUnique({
    where: {
      moduleId_projectId_teamId_reviewerUserId_revieweeUserId: {
        moduleId,
        projectId,
        teamId,
        reviewerUserId: reviewerId,
        revieweeUserId: revieweeId,
      },
    },
    include: {
      reviewee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
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

export function updatePeerAssessment(assessmentId: number, answersJson: any) {
  return prisma.peerAssessment.update({
    where: { id: assessmentId },
    data: {
      answersJson: answersJson,
      updatedAt: new Date(),
    },
  });
}
