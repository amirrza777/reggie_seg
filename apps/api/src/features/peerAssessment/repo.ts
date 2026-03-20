import { prisma } from "../../shared/db.js";

/** Returns the teammates. */
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

/** Creates a peer assessment. */
export function createPeerAssessment(data: {
  projectId: number;
  teamId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  templateId: number;
  answersJson: any;
  submittedLate?: boolean;
  effectiveDueDate?: Date | null;
}) {
  return prisma.peerAssessment.create({
    data: {
      projectId: data.projectId,
      teamId: data.teamId,
      reviewerUserId: data.reviewerUserId,
      revieweeUserId: data.revieweeUserId,
      templateId: data.templateId,
      answersJson: data.answersJson,
      submittedLate: data.submittedLate ?? false,
      effectiveDueDate: data.effectiveDueDate ?? null,
    },
  });
}

/** Returns the peer assessment. */
export function getPeerAssessment(
  projectId: number,
  teamId: number,
  reviewerId: number,
  revieweeId: number,
) {
  return prisma.peerAssessment.findUnique({
    where: {
      projectId_teamId_reviewerUserId_revieweeUserId: {
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

/** Updates the peer assessment. */
export function updatePeerAssessment(
  assessmentId: number,
  answersJson: any,
  meta?: { submittedLate?: boolean; effectiveDueDate?: Date | null },
) {
  const data: {
    answersJson: any;
    updatedAt: Date;
    submittedLate?: boolean;
    effectiveDueDate?: Date | null;
  } = {
    answersJson,
    updatedAt: new Date(),
  };

  if (typeof meta?.submittedLate === "boolean") {
    data.submittedLate = meta.submittedLate;
  }
  if (meta && "effectiveDueDate" in meta) {
    data.effectiveDueDate = meta.effectiveDueDate ?? null;
  }

  return prisma.peerAssessment.update({
    where: { id: assessmentId },
    data,
  });
}

/** Returns the teammate assessments. */
export function getTeammateAssessments(userId: number, projectId: number) {
  return prisma.peerAssessment.findMany({
    where: {
      reviewerUserId: userId,
      projectId: projectId,
    },
    include: {
      reviewee: {
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

/** Returns the questions for project. */
export function getQuestionsForProject(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
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

/** Returns the project questionnaire template. */
export function getProjectQuestionnaireTemplate(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
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

/** Returns the peer assessment by ID. */
export function getPeerAssessmentById(assessmentId: number) {
  return prisma.peerAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      questionnaireTemplate: {
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
        },
      },
      reviewee: {
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
