import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db.js";

const TEAM_ALLOCATION_RESPONSE_TEAM_PREFIX = "__custom_allocation_responses_project_";

const QUESTION_SELECT = {
  id: true,
  label: true,
  type: true,
  order: true,
  configs: true,
} as const;

const TEMPLATE_QUESTIONS_SELECT = {
  questions: {
    orderBy: { order: "asc" as const },
    select: QUESTION_SELECT,
  },
} as const;

type TeamAllocationQuestionnaireSubmissionContext = {
  projectId: number;
  enterpriseId: string;
  teamAllocationQuestionnaireOpenDate: Date | null;
  teamAllocationQuestionnaireDueDate: Date | null;
  template: {
    id: number;
    purpose: string;
    questions: Array<{
      id: number;
      label: string;
      type: string;
      order: number;
      configs: unknown;
    }>;
  };
};

export async function getQuestionsForProject(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      questionnaireTemplate: {
        select: {
          id: true,
          ...TEMPLATE_QUESTIONS_SELECT,
        },
      },
    },
  });
}

export async function getTeamAllocationQuestionnaireForProject(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      teamAllocationQuestionnaireTemplate: {
        select: {
          id: true,
          templateName: true,
          purpose: true,
          createdAt: true,
          ...TEMPLATE_QUESTIONS_SELECT,
        },
      },
    },
  });
}

type SubmissionUser = {
  id: number;
  role: string;
  active: boolean;
  enterpriseId: string;
};

async function findSubmissionUser(userId: number): Promise<SubmissionUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      active: true,
      enterpriseId: true,
    },
  });
}

function isActiveStudent(user: SubmissionUser | null): user is SubmissionUser {
  return Boolean(user && user.active !== false && user.role === "STUDENT");
}

async function isProjectScopedByStudentMembership(projectId: number): Promise<boolean> {
  const scopedProjectMembershipExists = await prisma.projectStudent.findFirst({
    where: { projectId },
    select: { userId: true },
  });

  return Boolean(scopedProjectMembershipExists);
}

function submissionContextProjectWhere(
  user: SubmissionUser,
  userId: number,
  projectId: number,
  enforceProjectStudentMembership: boolean,
): Prisma.ProjectWhereInput {
  return {
    id: projectId,
    archivedAt: null,
    module: {
      enterpriseId: user.enterpriseId,
      userModules: {
        some: {
          userId,
          enterpriseId: user.enterpriseId,
        },
      },
    },
    ...(enforceProjectStudentMembership
      ? {
          projectStudents: {
            some: {
              userId,
            },
          },
        }
      : {}),
  };
}

const SUBMISSION_CONTEXT_PROJECT_SELECT = {
  id: true,
  module: {
    select: {
      enterpriseId: true,
    },
  },
  deadline: {
    select: {
      teamAllocationQuestionnaireOpenDate: true,
      teamAllocationQuestionnaireDueDate: true,
    },
  },
  teamAllocationQuestionnaireTemplate: {
    select: {
      id: true,
      purpose: true,
      ...TEMPLATE_QUESTIONS_SELECT,
    },
  },
} as const;

async function findSubmissionContextProject(
  user: SubmissionUser,
  userId: number,
  projectId: number,
  enforceProjectStudentMembership: boolean,
) {
  return prisma.project.findFirst({
    where: submissionContextProjectWhere(user, userId, projectId, enforceProjectStudentMembership),
    select: SUBMISSION_CONTEXT_PROJECT_SELECT,
  });
}

function mapSubmissionContext(
  project: NonNullable<Awaited<ReturnType<typeof findSubmissionContextProject>>>,
): TeamAllocationQuestionnaireSubmissionContext {
  return {
    projectId: project.id,
    enterpriseId: project.module.enterpriseId,
    teamAllocationQuestionnaireOpenDate: project.deadline?.teamAllocationQuestionnaireOpenDate ?? null,
    teamAllocationQuestionnaireDueDate: project.deadline?.teamAllocationQuestionnaireDueDate ?? null,
    template: project.teamAllocationQuestionnaireTemplate!,
  };
}

export async function getTeamAllocationQuestionnaireSubmissionContext(
  userId: number,
  projectId: number,
): Promise<TeamAllocationQuestionnaireSubmissionContext | null> {
  const user = await findSubmissionUser(userId);
  if (!isActiveStudent(user)) {
    return null;
  }

  const enforceProjectStudentMembership = await isProjectScopedByStudentMembership(projectId);
  const project = await findSubmissionContextProject(user, userId, projectId, enforceProjectStudentMembership);

  if (!project || !project.teamAllocationQuestionnaireTemplate) {
    return null;
  }

  return mapSubmissionContext(project);
}

export async function hasActiveTeamForUserInProject(userId: number, projectId: number): Promise<boolean> {
  const existingTeam = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: {
        projectId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
    select: { teamId: true },
  });

  return Boolean(existingTeam);
}

async function findOrCreateSystemAllocationResponseTeam(projectId: number, enterpriseId: string): Promise<number> {
  const systemTeamName = `${TEAM_ALLOCATION_RESPONSE_TEAM_PREFIX}${projectId}`;

  const existingTeam = await prisma.team.findFirst({
    where: {
      projectId,
      teamName: systemTeamName,
    },
    select: { id: true },
  });

  if (existingTeam) {
    return existingTeam.id;
  }

  const createdTeam = await prisma.team.create({
    data: {
      teamName: systemTeamName,
      projectId,
      enterpriseId,
      allocationLifecycle: "DRAFT",
    },
    select: { id: true },
  });

  return createdTeam.id;
}

function teamAllocationResponseKey(
  input: { projectId: number; reviewerUserId: number },
  responseTeamId: number,
) {
  return {
    projectId_teamId_reviewerUserId_revieweeUserId: {
      projectId: input.projectId,
      teamId: responseTeamId,
      reviewerUserId: input.reviewerUserId,
      revieweeUserId: input.reviewerUserId,
    },
  };
}

function teamAllocationResponseCreateData(
  input: {
    projectId: number;
    templateId: number;
    reviewerUserId: number;
    answersJson: unknown;
  },
  responseTeamId: number,
) {
  return {
    projectId: input.projectId,
    teamId: responseTeamId,
    reviewerUserId: input.reviewerUserId,
    revieweeUserId: input.reviewerUserId,
    templateId: input.templateId,
    answersJson: input.answersJson as Prisma.InputJsonValue,
    submittedLate: false,
    effectiveDueDate: null,
  };
}

function buildTeamAllocationResponseUpsert(
  input: {
    projectId: number;
    templateId: number;
    reviewerUserId: number;
    answersJson: unknown;
  },
  responseTeamId: number,
) {
  return {
    where: teamAllocationResponseKey(input, responseTeamId),
    update: {
      templateId: input.templateId,
      answersJson: input.answersJson as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
    create: teamAllocationResponseCreateData(input, responseTeamId),
    select: {
      id: true,
      updatedAt: true,
    },
  } as const;
}

export async function upsertTeamAllocationQuestionnaireResponse(input: {
  projectId: number;
  enterpriseId: string;
  templateId: number;
  reviewerUserId: number;
  answersJson: unknown;
}) {
  const responseTeamId = await findOrCreateSystemAllocationResponseTeam(input.projectId, input.enterpriseId);
  return prisma.peerAssessment.upsert(buildTeamAllocationResponseUpsert(input, responseTeamId));
}

export async function hasTeamAllocationQuestionnaireResponse(input: {
  projectId: number;
  templateId: number;
  userId: number;
}): Promise<boolean> {
  const response = await prisma.peerAssessment.findFirst({
    where: {
      projectId: input.projectId,
      templateId: input.templateId,
      reviewerUserId: input.userId,
      revieweeUserId: input.userId,
      team: {
        projectId: input.projectId,
        allocationLifecycle: "DRAFT",
        teamName: {
          startsWith: TEAM_ALLOCATION_RESPONSE_TEAM_PREFIX,
        },
      },
    },
    select: { id: true },
  });

  return Boolean(response);
}
