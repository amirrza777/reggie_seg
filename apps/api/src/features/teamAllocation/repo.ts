import type { Prisma, TeamInviteStatus } from "@prisma/client";
import { prisma } from "../../shared/db.js";

type StaffUserRole = "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";

export type StaffScopedProject = {
  id: number;
  name: string;
  moduleId: number;
  moduleName: string;
  archivedAt: Date | null;
  enterpriseId: string;
};

export type ModuleStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type ProjectTeamSummary = {
  id: number;
  teamName: string;
  memberCount: number;
};

export type ManualAllocationStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  currentTeamId: number | null;
  currentTeamName: string | null;
};

export type AppliedRandomTeam = {
  id: number;
  teamName: string;
  memberCount: number;
};

export type AppliedManualTeam = {
  id: number;
  teamName: string;
  memberCount: number;
};

/** Returns the active invite. */
export async function findActiveInvite(teamId: number, inviteeEmail: string) {
  return prisma.teamInvite.findFirst({
    where: {
      teamId,
      inviteeEmail,
      active: true,
      status: "PENDING",
    },
  });
}

/** Creates a team invite record. */
export async function createTeamInviteRecord(data: {
  teamId: number;
  inviterId: number;
  inviteeId?: number | null;
  inviteeEmail: string;
  tokenHash: string;
  expiresAt: Date;
  message?: string | null;
}) {
  return prisma.teamInvite.create({
    data: {
      teamId: data.teamId,
      inviterId: data.inviterId,
      inviteeId: data.inviteeId ?? null,
      inviteeEmail: data.inviteeEmail,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      status: "PENDING",
      active: true,
      message: data.message ?? null,
    },
  });
}

/** Returns the invite context. */
export async function findInviteContext(teamId: number, inviterId: number) {
  const [team, inviter] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: { teamName: true, projectId: true },
    }),
    prisma.user.findUnique({
      where: { id: inviterId },
      select: { firstName: true, lastName: true, email: true },
    }),
  ]);

  return { team, inviter };
}

/** Returns a team archive status by id. */
export async function findTeamArchiveStatus(teamId: number) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: { archivedAt: true },
  });
}

/** Returns the invites for team. */
export async function getInvitesForTeam(teamId: number) {
  return prisma.teamInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    include: {
      inviter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

/** Returns the pending invites for email. */
export async function findPendingInvitesForEmail(email: string) {
  return prisma.teamInvite.findMany({
    where: { inviteeEmail: email, status: "PENDING", active: true },
    include: {
      team: { select: { id: true, teamName: true, projectId: true } },
      inviter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Returns the normalized email address for a user when present. */
export async function findUserEmailById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
}

/** Returns a user id by email when present. */
export async function findUserIdByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
}

/** Returns a user's enterprise id by user id when present. */
export async function findUserEnterpriseById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { enterpriseId: true },
  });
}

/** Updates the invite status from pending. */
export async function updateInviteStatusFromPending(
  inviteId: string,
  status: TeamInviteStatus,
  now: Date,
) {
  const result = await prisma.teamInvite.updateMany({
    where: {
      id: inviteId,
      status: "PENDING",
      active: true,
    },
    data: {
      status,
      active: false,
      respondedAt: now,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.teamInvite.findUnique({
    where: { id: inviteId },
  });
}

/** Returns the staff scoped project. */
export async function findStaffScopedProject(
  staffId: number,
  projectId: number,
): Promise<StaffScopedProject | null> {
  const user = await prisma.user.findUnique({
    where: { id: staffId },
    select: { enterpriseId: true, role: true, active: true },
  });

  if (!user || user.active === false) {
    return null;
  }

  const role = user.role as StaffUserRole | "STUDENT";
  if (role === "STUDENT") {
    return null;
  }

  const hasEnterpriseWideAccess = role === "ADMIN" || role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: user.enterpriseId,
        ...(hasEnterpriseWideAccess
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId: staffId } } },
                { moduleTeachingAssistants: { some: { userId: staffId } } },
              ],
            }),
      },
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      archivedAt: true,
      module: {
        select: { name: true },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
    moduleId: project.moduleId,
    moduleName: project.module.name,
    archivedAt: project.archivedAt,
    enterpriseId: user.enterpriseId,
  };
}

/** Returns the vacant module students for project. */
export async function findVacantModuleStudentsForProject(
  enterpriseId: string,
  moduleId: number,
  projectId: number,
): Promise<ModuleStudent[]> {
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

/** Returns the module students for manual allocation. */
export async function findModuleStudentsForManualAllocation(
  enterpriseId: string,
  moduleId: number,
  projectId: number,
  options?: { query?: string | null },
): Promise<ManualAllocationStudent[]> {
  const normalizedQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const hasQuery = normalizedQuery.length > 0;
  const numericQuery = hasQuery ? Number(normalizedQuery) : Number.NaN;

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
      ...(hasQuery
        ? {
            OR: [
              { firstName: { contains: normalizedQuery, mode: "insensitive" as const } },
              { lastName: { contains: normalizedQuery, mode: "insensitive" as const } },
              { email: { contains: normalizedQuery, mode: "insensitive" as const } },
              {
                teamAllocations: {
                  some: {
                    team: {
                      projectId,
                      archivedAt: null,
                      teamName: { contains: normalizedQuery, mode: "insensitive" as const },
                    },
                  },
                },
              },
              ...(Number.isInteger(numericQuery) && numericQuery > 0 ? [{ id: numericQuery }] : []),
            ],
          }
        : {}),
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

/** Returns the project team summaries. */
export async function findProjectTeamSummaries(projectId: number): Promise<ProjectTeamSummary[]> {
  const teams = await prisma.team.findMany({
    where: { projectId },
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

/** Applies the random allocation plan. */
export async function applyRandomAllocationPlan(
  projectId: number,
  enterpriseId: string,
  plannedTeams: Array<{ members: Array<{ id: number }> }>,
  options: { teamNames?: string[] } = {},
): Promise<AppliedRandomTeam[]> {
  return prisma.$transaction(async (tx) => {
    const plannedStudentIds = plannedTeams.flatMap((team) => team.members.map((member) => member.id));
    if (plannedStudentIds.length > 0) {
      const alreadyAllocatedStudents = await tx.teamAllocation.findMany({
        where: {
          userId: { in: plannedStudentIds },
          team: {
            projectId,
            archivedAt: null,
          },
        },
        select: { userId: true },
      });

      if (alreadyAllocatedStudents.length > 0) {
        throw { code: "STUDENTS_NO_LONGER_VACANT" };
      }
    }

    const enterpriseNames = await tx.team.findMany({
      where: { enterpriseId },
      select: { teamName: true },
    });
    const usedNames = new Set(enterpriseNames.map((team) => team.teamName));
    const targetTeams: Array<{ id: number; teamName: string }> = [];

    const requestedTeamNames =
      options.teamNames ??
      plannedTeams.map((_, index) => `Random Team ${index + 1}`);
    if (requestedTeamNames.length !== plannedTeams.length) {
      throw { code: "INVALID_TEAM_NAMES" };
    }

    for (let index = 0; index < requestedTeamNames.length; index += 1) {
      const teamName = requestedTeamNames[index].trim();
      if (teamName.length === 0) {
        throw { code: "INVALID_TEAM_NAMES" };
      }
      if (usedNames.has(teamName)) {
        throw { code: "TEAM_NAME_ALREADY_EXISTS" };
      }

      const createdTeam = await tx.team.create({
        data: {
          enterpriseId,
          projectId,
          teamName,
        },
        select: { id: true, teamName: true },
      });
      usedNames.add(teamName);
      targetTeams.push(createdTeam);
    }

    for (let index = 0; index < plannedTeams.length; index += 1) {
      const team = targetTeams[index];
      const allocations = plannedTeams[index].members.map((member) => ({
        teamId: team.id,
        userId: member.id,
      }));

      if (allocations.length > 0) {
        await tx.teamAllocation.createMany({
          data: allocations,
          skipDuplicates: true,
        });
      }
    }

    return plannedTeams.map((plan, index) => ({
      id: targetTeams[index].id,
      teamName: targetTeams[index].teamName,
      memberCount: plan.members.length,
    }));
  });
}

/** Applies the manual allocation team. */
export async function applyManualAllocationTeam(
  projectId: number,
  enterpriseId: string,
  teamName: string,
  studentIds: number[],
): Promise<AppliedManualTeam> {
  return prisma.$transaction(async (tx) => {
    const existingName = await tx.team.findFirst({
      where: {
        enterpriseId,
        teamName,
      },
      select: {
        id: true,
      },
    });

    if (existingName) {
      throw { code: "TEAM_NAME_ALREADY_EXISTS" };
    }

    const conflictingAllocations = await tx.teamAllocation.findMany({
      where: {
        userId: { in: studentIds },
        team: {
          projectId,
          archivedAt: null,
        },
      },
      select: {
        userId: true,
      },
    });

    if (conflictingAllocations.length > 0) {
      throw { code: "STUDENTS_NO_LONGER_AVAILABLE" };
    }

    const team = await tx.team.create({
      data: {
        enterpriseId,
        projectId,
        teamName,
      },
      select: {
        id: true,
        teamName: true,
      },
    });

    await tx.teamAllocation.createMany({
      data: studentIds.map((studentId) => ({
        teamId: team.id,
        userId: studentId,
      })),
      skipDuplicates: true,
    });

    return {
      id: team.id,
      teamName: team.teamName,
      memberCount: studentIds.length,
    };
  });
}

/** Creates a team and owner allocation. */
export async function createTeamWithOwner(userId: number, teamData: Prisma.TeamUncheckedCreateInput) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.create({ data: teamData });
    await tx.teamAllocation.create({
      data: {
        teamId: team.id,
        userId,
      },
    });
    return team;
  });
}

/** Creates a team record only. */
export async function createTeamRecord(data: Prisma.TeamUncheckedCreateInput) {
  return prisma.team.create({ data });
}

/** Creates a team allocation. */
export async function createTeamAllocation(teamId: number, userId: number) {
  return prisma.teamAllocation.create({
    data: { teamId, userId },
  });
}

/** Returns a team by id with allocations. */
export async function findTeamById(teamId: number) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      allocations: {
        include: { user: true },
      },
    },
  });
}

/** Returns a team allocation by team and user. */
export async function findTeamAllocation(teamId: number, userId: number) {
  return prisma.teamAllocation.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
}

/** Returns member users for a team. */
export async function listTeamMemberUsers(teamId: number) {
  const allocations = await prisma.teamAllocation.findMany({
    where: { teamId },
    include: { user: true },
  });

  return allocations.map((entry) => entry.user);
}
