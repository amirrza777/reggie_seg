import { prisma } from "../../shared/db.js";
import {
  mergeDeadlinesForTeam,
  parseDeadlineOverrideMetadata,
  PROJECT_DEADLINE_MERGE_SELECT,
  serializeDeadlineOverrideMetadata,
  type DeadlineFieldKey,
  type DeadlineInputMode,
} from "./repo.deadline-helpers.js";

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

const teamHealthMessageSelect = {
  id: true,
  projectId: true,
  teamId: true,
  requesterUserId: true,
  subject: true,
  details: true,
  resolved: true,
  responseText: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  requester: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export async function createTeamHealthMessage(
  projectId: number,
  teamId: number,
  requesterUserId: number,
  subject: string,
  details: string,
) {
  return prisma.teamHealthMessage.create({
    data: {
      projectId,
      teamId,
      requesterUserId,
      subject,
      details,
    },
    select: teamHealthMessageSelect,
  });
}

export async function getTeamHealthMessagesForUserInProject(
  projectId: number,
  requesterUserId: number,
) {
  return prisma.teamHealthMessage.findMany({
    where: {
      projectId,
      requesterUserId,
    },
    orderBy: { createdAt: "desc" },
    select: teamHealthMessageSelect,
  });
}

export async function getTeamHealthMessagesForTeamInProject(
  projectId: number,
  teamId: number,
) {
  return prisma.teamHealthMessage.findMany({
    where: {
      projectId,
      teamId,
    },
    orderBy: { createdAt: "desc" },
    select: teamHealthMessageSelect,
  });
}

export async function hasAnotherResolvedTeamHealthMessage(
  projectId: number,
  teamId: number,
  requestId: number,
) {
  const existing = await prisma.teamHealthMessage.findFirst({
    where: {
      projectId,
      teamId,
      resolved: true,
      NOT: { id: requestId },
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export async function canStaffAccessTeamInProject(
  userId: number,
  projectId: number,
  teamId: number,
) {
  const user = await getScopedStaffUser(userId);
  if (!user) return false;

  const roleCanAccessAll = user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      teams: {
        some: { id: teamId, archivedAt: null, allocationLifecycle: "ACTIVE" },
      },
      module: {
        enterpriseId: user.enterpriseId,
        ...(roleCanAccessAll
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId } } },
                { moduleTeachingAssistants: { some: { userId } } },
              ],
            }),
      },
    },
    select: { id: true },
  });

  return Boolean(project);
}

export { type DeadlineInputMode } from "./repo.deadline-helpers.js";

export async function getTeamCurrentDeadlineInProject(projectId: number, teamId: number) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, projectId },
    select: {
      project: {
        select: {
          deadline: {
            select: PROJECT_DEADLINE_MERGE_SELECT,
          },
        },
      },
      deadlineOverride: {
        select: {
          taskOpenDate: true,
          taskDueDate: true,
          assessmentOpenDate: true,
          assessmentDueDate: true,
          feedbackOpenDate: true,
          feedbackDueDate: true,
        },
      },
    },
  });
  if (!team) return null;
  return mergeDeadlinesForTeam(team.project.deadline, team.deadlineOverride);
}

export async function getTeamDeadlineDetailsInProject(projectId: number, teamId: number) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, projectId },
    select: {
      deadlineProfile: true,
      project: {
        select: {
          deadline: {
            select: PROJECT_DEADLINE_MERGE_SELECT,
          },
        },
      },
      deadlineOverride: {
        select: {
          taskOpenDate: true,
          taskDueDate: true,
          assessmentOpenDate: true,
          assessmentDueDate: true,
          feedbackOpenDate: true,
          feedbackDueDate: true,
          reason: true,
        },
      },
    },
  });
  if (!team?.project.deadline) return null;

  const merged = mergeDeadlinesForTeam(team.project.deadline, team.deadlineOverride);
  if (!merged) return null;

  const profile = team.deadlineProfile === "MCF" ? "MCF" : "STANDARD";
  const effectiveDeadline = { ...merged, deadlineProfile: profile };

  const metadata = parseDeadlineOverrideMetadata(team.deadlineOverride?.reason);
  return {
    baseDeadline: {
      taskOpenDate: team.project.deadline.taskOpenDate,
      taskDueDate: team.project.deadline.taskDueDate,
      taskDueDateMcf: team.project.deadline.taskDueDateMcf ?? null,
      assessmentOpenDate: team.project.deadline.assessmentOpenDate,
      assessmentDueDate: team.project.deadline.assessmentDueDate,
      assessmentDueDateMcf: team.project.deadline.assessmentDueDateMcf ?? null,
      feedbackOpenDate: team.project.deadline.feedbackOpenDate,
      feedbackDueDate: team.project.deadline.feedbackDueDate,
      feedbackDueDateMcf: team.project.deadline.feedbackDueDateMcf ?? null,
      isOverridden: false,
      deadlineProfile: profile,
    },
    effectiveDeadline,
    deadlineInputMode: metadata?.inputMode ?? null,
    shiftDays: metadata?.shiftDays ?? null,
  };
}

export async function reviewTeamHealthMessage(
  projectId: number,
  teamId: number,
  requestId: number,
  reviewerUserId: number,
  resolved: boolean,
  responseText?: string,
) {
  const existing = await prisma.teamHealthMessage.findFirst({
    where: { id: requestId, projectId, teamId },
    select: { id: true, resolved: true },
  });
  if (!existing) return null;

  if (!resolved && existing.resolved) {
    return prisma.$transaction(async (tx) => {
      await tx.teamDeadlineOverride.deleteMany({
        where: { teamId },
      });

      return tx.teamHealthMessage.update({
        where: { id: requestId },
        data: {
          resolved: false,
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
          responseText: null,
        },
        select: teamHealthMessageSelect,
      });
    });
  }

  return prisma.teamHealthMessage.update({
    where: { id: requestId },
    data: {
      resolved,
      reviewedByUserId: reviewerUserId,
      reviewedAt: new Date(),
      ...(resolved
        ? { ...(responseText !== undefined ? { responseText } : {}) }
        : { responseText: null }),
    },
    select: teamHealthMessageSelect,
  });
}

export async function resolveTeamHealthMessageWithDeadlineOverride(
  projectId: number,
  teamId: number,
  requestId: number,
  reviewerUserId: number,
  overrides: {
    taskOpenDate: Date | null;
    taskDueDate: Date | null;
    assessmentOpenDate: Date | null;
    assessmentDueDate: Date | null;
    feedbackOpenDate: Date | null;
    feedbackDueDate: Date | null;
  },
  metadata?: {
    inputMode?: DeadlineInputMode;
    shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
  },
) {
  return prisma.$transaction(async (tx) => {
    const existingRequest = await tx.teamHealthMessage.findFirst({
      where: { id: requestId, projectId, teamId },
      select: { id: true },
    });
    if (!existingRequest) return null;

    const team = await tx.team.findFirst({
      where: { id: teamId, projectId },
      select: {
        project: {
          select: {
            deadline: {
              select: {
                id: true,
                ...PROJECT_DEADLINE_MERGE_SELECT,
              },
            },
          },
        },
      },
    });
    const projectDeadline = team?.project.deadline ?? null;
    if (!projectDeadline) return null;

    const reason = serializeDeadlineOverrideMetadata(metadata);

    const deadlineOverride = await tx.teamDeadlineOverride.upsert({
      where: { teamId },
      update: {
        projectDeadlineId: projectDeadline.id,
        taskOpenDate: overrides.taskOpenDate,
        taskDueDate: overrides.taskDueDate,
        assessmentOpenDate: overrides.assessmentOpenDate,
        assessmentDueDate: overrides.assessmentDueDate,
        feedbackOpenDate: overrides.feedbackOpenDate,
        feedbackDueDate: overrides.feedbackDueDate,
        ...(reason !== undefined ? { reason } : {}),
      },
      create: {
        teamId,
        projectDeadlineId: projectDeadline.id,
        taskOpenDate: overrides.taskOpenDate,
        taskDueDate: overrides.taskDueDate,
        assessmentOpenDate: overrides.assessmentOpenDate,
        assessmentDueDate: overrides.assessmentDueDate,
        feedbackOpenDate: overrides.feedbackOpenDate,
        feedbackDueDate: overrides.feedbackDueDate,
        reason: reason ?? null,
      },
      select: {
        taskOpenDate: true,
        taskDueDate: true,
        assessmentOpenDate: true,
        assessmentDueDate: true,
        feedbackOpenDate: true,
        feedbackDueDate: true,
      },
    });

    const request = await tx.teamHealthMessage.update({
      where: { id: requestId },
      data: {
        resolved: true,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      },
      select: teamHealthMessageSelect,
    });

    const deadline = mergeDeadlinesForTeam(projectDeadline, deadlineOverride);
    return { request, deadline };
  });
}
