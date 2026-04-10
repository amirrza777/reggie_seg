import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import type {
  ManualAllocationStudent,
  ModuleStudent,
  ProjectTeamSummary,
} from "./repo.types.js";

export type InviteEligibleStudent = ModuleStudent;

async function buildProjectStudentScope(projectId: number): Promise<Prisma.UserWhereInput> {
  const hasProjectStudents = await prisma.projectStudent.findFirst({
    where: { projectId },
    select: { userId: true },
  });
  if (!hasProjectStudents) return {};
  return {
    projectStudents: {
      some: {
        projectId,
      },
    },
  };
}

export async function findVacantModuleStudentsForProject(
  enterpriseId: string,
  moduleId: number,
  projectId: number,
): Promise<ModuleStudent[]> {
  const projectStudentScope = await buildProjectStudentScope(projectId);
  return prisma.user.findMany({
    where: {
      enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
      teamAllocations: {
        none: {
          team: {
            projectId,
            archivedAt: null,
          },
        },
      },
      ...projectStudentScope,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });
}

export async function findModuleStudentsForManualAllocation(
  enterpriseId: string,
  moduleId: number,
  projectId: number,
  searchQuery?: string,
): Promise<ManualAllocationStudent[]> {
  const normalizedSearchQuery = typeof searchQuery === "string" ? searchQuery.trim() : "";
  const searchFilters: Prisma.UserWhereInput[] = [];
  const projectStudentScope = await buildProjectStudentScope(projectId);
  if (normalizedSearchQuery.length > 0) {
    const queryFilters: Prisma.UserWhereInput[] = [
      { email: { contains: normalizedSearchQuery } },
      { firstName: { contains: normalizedSearchQuery } },
      { lastName: { contains: normalizedSearchQuery } },
    ];
    const numericQuery = Number(normalizedSearchQuery);
    if (Number.isInteger(numericQuery) && numericQuery > 0) {
      queryFilters.push({ id: numericQuery });
    }
    searchFilters.push({ OR: queryFilters });
  }

  const students = await prisma.user.findMany({
    where: {
      enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
      ...(searchFilters.length > 0 ? { AND: searchFilters } : {}),
      ...projectStudentScope,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      teamAllocations: {
        where: {
          team: {
            projectId,
            archivedAt: null,
          },
        },
        select: {
          team: {
            select: {
              id: true,
              teamName: true,
            },
          },
        },
        orderBy: {
          teamId: "asc",
        },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });

  return students.map((student) => {
    const currentTeam = student.teamAllocations[0]?.team ?? null;

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      currentTeamId: currentTeam?.id ?? null,
      currentTeamName: currentTeam?.teamName ?? null,
    };
  });
}

export async function findInviteEligibleStudentsForTeam(
  teamId: number,
  requesterId: number,
): Promise<InviteEligibleStudent[]> {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
    },
    select: {
      id: true,
      enterpriseId: true,
      projectId: true,
      project: {
        select: {
          moduleId: true,
        },
      },
    },
  });
  if (!team) {
    throw { code: "TEAM_NOT_FOUND_OR_INACTIVE" };
  }

  const requesterAllocation = await prisma.teamAllocation.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: requesterId,
      },
    },
    select: { teamId: true },
  });
  if (!requesterAllocation) {
    throw { code: "TEAM_ACCESS_FORBIDDEN" };
  }

  const projectStudentScope = await buildProjectStudentScope(team.projectId);
  return prisma.user.findMany({
    where: {
      enterpriseId: team.enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId: team.enterpriseId,
          moduleId: team.project.moduleId,
        },
      },
      teamAllocations: {
        none: {
          team: {
            projectId: team.projectId,
            archivedAt: null,
            allocationLifecycle: "ACTIVE",
          },
        },
      },
      ...projectStudentScope,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });
}

export async function findInviteEligibleStudentForTeamByEmail(teamId: number, email: string) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
    },
    select: {
      enterpriseId: true,
      projectId: true,
      project: {
        select: {
          moduleId: true,
        },
      },
    },
  });
  if (!team) {
    return null;
  }

  const projectStudentScope = await buildProjectStudentScope(team.projectId);
  return prisma.user.findFirst({
    where: {
      email: { equals: email },
      enterpriseId: team.enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId: team.enterpriseId,
          moduleId: team.project.moduleId,
        },
      },
      teamAllocations: {
        none: {
          team: {
            projectId: team.projectId,
            archivedAt: null,
            allocationLifecycle: "ACTIVE",
          },
        },
      },
      ...projectStudentScope,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

export async function findProjectTeamSummaries(projectId: number): Promise<ProjectTeamSummary[]> {
  const teams = await prisma.team.findMany({
    where: { projectId, archivedAt: null, allocationLifecycle: "ACTIVE" },
    select: {
      id: true,
      teamName: true,
      _count: {
        select: { allocations: true },
      },
    },
    orderBy: [{ teamName: "asc" }, { id: "asc" }],
  });

  return teams.map((team) => ({
    id: team.id,
    teamName: team.teamName,
    memberCount: team._count.allocations,
  }));
}