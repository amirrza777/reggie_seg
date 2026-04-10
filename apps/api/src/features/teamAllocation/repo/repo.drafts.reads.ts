import type { TeamAllocationLifecycle } from "@prisma/client";
import { prisma } from "../../../shared/db.js";
import type {
  ProjectDraftTeam,
  ProjectDraftTeamConflict,
} from "./repo.types.js";

function mapProjectDraftTeam(team: {
  id: number;
  teamName: string;
  createdAt: Date;
  updatedAt: Date;
  draftCreatedBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  allocations: Array<{
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  _count: {
    allocations: number;
  };
}): ProjectDraftTeam {
  const members = team.allocations
    .map((allocation) => allocation.user)
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .sort((left, right) => {
      const leftLastName = typeof left.lastName === "string" ? left.lastName : "";
      const rightLastName = typeof right.lastName === "string" ? right.lastName : "";
      const leftFirstName = typeof left.firstName === "string" ? left.firstName : "";
      const rightFirstName = typeof right.firstName === "string" ? right.firstName : "";
      const lastNameComparison = leftLastName.localeCompare(rightLastName);
      if (lastNameComparison !== 0) return lastNameComparison;
      const firstNameComparison = leftFirstName.localeCompare(rightFirstName);
      if (firstNameComparison !== 0) return firstNameComparison;
      return left.id - right.id;
    });

  return {
    id: team.id,
    teamName: team.teamName,
    memberCount: team._count.allocations,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    draftCreatedBy: team.draftCreatedBy,
    members,
  };
}

export async function findProjectDraftTeams(projectId: number): Promise<ProjectDraftTeam[]> {
  const teams = await prisma.team.findMany({
    where: {
      projectId,
      archivedAt: null,
      allocationLifecycle: "DRAFT",
    },
    select: {
      id: true,
      teamName: true,
      createdAt: true,
      updatedAt: true,
      draftCreatedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      allocations: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [{ userId: "asc" }],
      },
      _count: {
        select: {
          allocations: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });

  return teams.map(mapProjectDraftTeam);
}

export async function findDraftTeamInProject(projectId: number, teamId: number) {
  return prisma.team.findFirst({
    where: {
      id: teamId,
      projectId,
      archivedAt: null,
      allocationLifecycle: "DRAFT",
    },
    select: {
      id: true,
      teamName: true,
      projectId: true,
      enterpriseId: true,
    },
  });
}

export async function findDraftTeamById(teamId: number): Promise<ProjectDraftTeam | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      teamName: true,
      createdAt: true,
      updatedAt: true,
      allocationLifecycle: true,
      archivedAt: true,
      draftCreatedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      allocations: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [{ userId: "asc" }],
      },
      _count: {
        select: {
          allocations: true,
        },
      },
    },
  });

  if (!team || team.archivedAt !== null || team.allocationLifecycle !== "DRAFT") {
    return null;
  }

  return mapProjectDraftTeam(team);
}

export async function findTeamNameConflictInEnterprise(
  enterpriseId: string,
  teamName: string,
  options: { excludeTeamId?: number } = {},
) {
  const existing = await prisma.team.findFirst({
    where: {
      enterpriseId,
      teamName,
      ...(options.excludeTeamId !== undefined ? { id: { not: options.excludeTeamId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
}

export async function findModuleStudentsByIdsInModule(
  enterpriseId: string,
  moduleId: number,
  studentIds: number[],
) {
  if (studentIds.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      id: { in: studentIds },
      enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

export async function findStudentAllocationConflictsInProject(
  projectId: number,
  studentIds: number[],
  lifecycle: TeamAllocationLifecycle,
  options: { excludeTeamId?: number } = {},
): Promise<ProjectDraftTeamConflict[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const rows = await prisma.teamAllocation.findMany({
    where: {
      userId: { in: studentIds },
      team: {
        projectId,
        archivedAt: null,
        allocationLifecycle: lifecycle,
        ...(options.excludeTeamId !== undefined ? { id: { not: options.excludeTeamId } } : {}),
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      team: {
        select: {
          id: true,
          teamName: true,
        },
      },
    },
    orderBy: [{ userId: "asc" }, { teamId: "asc" }],
  });

  return rows.map((row) => ({
    userId: row.userId,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    email: row.user.email,
    teamId: row.team.id,
    teamName: row.team.teamName,
  }));
}