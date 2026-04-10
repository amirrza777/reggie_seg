import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db.js";
import type {
  AppliedManualTeam,
  AppliedRandomTeam,
} from "./repo.types.js";

export async function applyRandomAllocationPlan(
  projectId: number,
  enterpriseId: string,
  plannedTeams: Array<{ members: Array<{ id: number }> }>,
  options: { teamNames?: string[]; draftCreatedById?: number } = {},
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
      const teamName = requestedTeamNames[index]!.trim();
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
          allocationLifecycle: "DRAFT",
          draftCreatedById: options.draftCreatedById ?? null,
          draftApprovedById: null,
          draftApprovedAt: null,
        },
        select: { id: true, teamName: true },
      });
      usedNames.add(teamName);
      targetTeams.push(createdTeam);
    }

    for (let index = 0; index < plannedTeams.length; index += 1) {
      const team = targetTeams[index]!;
      const plannedTeam = plannedTeams[index]!;
      const allocations = plannedTeam.members.map((member) => ({
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
      id: targetTeams[index]!.id,
      teamName: targetTeams[index]!.teamName,
      memberCount: plan.members.length,
    }));
  });
}

export async function applyManualAllocationTeam(
  projectId: number,
  enterpriseId: string,
  teamName: string,
  studentIds: number[],
  options: { draftCreatedById?: number } = {},
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
        allocationLifecycle: "DRAFT",
        draftCreatedById: options.draftCreatedById ?? null,
        draftApprovedById: null,
        draftApprovedAt: null,
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

export const TeamService = {
  // Create a team and add the creator as an owner in TeamAllocation.
  async createTeam(userId: number, teamData: Prisma.TeamUncheckedCreateInput) {
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: teamData });
      await tx.teamAllocation.create({
        data: {
          teamId: team.id,
          userId,
          // role "OWNER" is implied; TeamAllocation has no role column in schema.
        },
      });
      return team;
    });
  },

  // Fetch a team and include members via TeamAllocation.
  async getTeamById(teamId: number) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
      include: {
        allocations: {
          include: { user: true },
        },
      },
    });
    if (!team) throw { code: "TEAM_NOT_FOUND" };
    return team;
  },

  // Add a user to a team (role defaults to MEMBER, not stored in schema).
  async addUserToTeam(teamId: number, userId: number, _role: "OWNER" | "MEMBER" = "MEMBER") {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    });
    if (!team) throw { code: "TEAM_NOT_FOUND" };

    const existing = await prisma.teamAllocation.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) throw { code: "MEMBER_ALREADY_EXISTS" };

    return prisma.teamAllocation.create({
      data: { teamId, userId },
    });
  },

  // Return all users allocated to a team.
  async getTeamMembers(teamId: number) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    });
    if (!team) throw { code: "TEAM_NOT_FOUND" };

    const allocations = await prisma.teamAllocation.findMany({
      where: { teamId },
      include: { user: true },
    });

    return allocations.map((entry) => entry.user);
  },
};