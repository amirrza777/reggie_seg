import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const USER_PROJECTS_SELECT = {
  id: true,
  name: true,
  moduleId: true,
  archivedAt: true,
  module: {
    select: {
      name: true,
    },
  },
} as const;

function userProjectsWhere(userId: number): Prisma.ProjectWhereInput {
  return {
    OR: [
      {
        teams: {
          some: {
            archivedAt: null,
            allocationLifecycle: "ACTIVE",
            allocations: { some: { userId } },
          },
        },
      },
      {
        projectStudents: {
          some: {
            userId,
          },
        },
      },
    ],
  };
}

export async function getUserProjects(userId: number) {
  return prisma.project.findMany({
    where: userProjectsWhere(userId),
    select: USER_PROJECTS_SELECT,
  });
}

const TEAMMATES_SELECT = {
  userId: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

function teammatesWhere(userId: number, projectId: number): Prisma.TeamAllocationWhereInput {
  return {
    team: {
      projectId,
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
      allocations: {
        some: {
          userId,
        },
      },
    },
  };
}

export async function getTeammatesInProject(userId: number, projectId: number) {
  return prisma.teamAllocation.findMany({
    where: teammatesWhere(userId, projectId),
    select: TEAMMATES_SELECT,
  });
}

const TEAM_SELECT = {
  id: true,
  teamName: true,
  projectId: true,
  createdAt: true,
  allocations: {
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
} as const;

export async function getTeamById(teamId: number) {
  return prisma.team.findFirst({
    where: { id: teamId, archivedAt: null, allocationLifecycle: "ACTIVE" },
    select: TEAM_SELECT,
  });
}

const TEAM_BY_USER_AND_PROJECT_SELECT = {
  ...TEAM_SELECT,
  trelloBoardId: true,
} as const;

function teamByUserAndProjectWhere(userId: number, projectId: number): Prisma.TeamWhereInput {
  return {
    projectId,
    archivedAt: null,
    allocationLifecycle: "ACTIVE",
    allocations: {
      some: {
        userId,
      },
    },
  };
}

export async function getTeamByUserAndProject(userId: number, projectId: number) {
  return prisma.team.findFirst({
    where: teamByUserAndProjectWhere(userId, projectId),
    select: TEAM_BY_USER_AND_PROJECT_SELECT,
  });
}
