import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

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

export async function findInviteContext(teamId: number, inviterId: number) {
  const [team, inviter] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: { teamName: true },
    }),
    prisma.user.findUnique({
      where: { id: inviterId },
      select: { firstName: true, lastName: true, email: true },
    }),
  ]);

  return { team, inviter };
}

export async function getInvitesForTeam(teamId: number) {
  return prisma.teamInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
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
    const team = await prisma.team.findUnique({
      where: { id: teamId },
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
    const team = await prisma.team.findUnique({ where: { id: teamId } });
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
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw { code: "TEAM_NOT_FOUND" };

    const allocations = await prisma.teamAllocation.findMany({
      where: { teamId },
      include: { user: true },
    });

    return allocations.map((entry) => entry.user);
  },
};
