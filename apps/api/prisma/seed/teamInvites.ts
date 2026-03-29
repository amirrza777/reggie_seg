import { TeamInviteStatus } from "@prisma/client";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";
import { SEED_TEAM_INVITES_TOTAL } from "./volumes";

type PlannedInvite = {
  teamId: number;
  inviterId: number;
  inviteeId: number;
  inviteeEmail: string;
  status: TeamInviteStatus;
  tokenHash: string;
  active: boolean;
  expiresAt: Date;
  respondedAt: Date | null;
  message: string;
};

const INVITE_STATUS_SEQUENCE: TeamInviteStatus[] = ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"];

export async function seedTeamInvites(context: SeedContext) {
  return withSeedLogging("seedTeamInvites", async () => {
    if (context.teams.length === 0 || context.usersByRole.students.length < 3) {
      return { value: undefined, rows: 0, details: "skipped (insufficient teams/students)" };
    }

    const allocations = await prisma.teamAllocation.findMany({
      where: { teamId: { in: context.teams.map((team) => team.id) } },
      select: { teamId: true, userId: true },
      orderBy: [{ teamId: "asc" }, { userId: "asc" }],
    });

    const allocatedUserIds = new Set(allocations.map((allocation) => allocation.userId));
    const inviteeUsers = await prisma.user.findMany({
      where: {
        id: { in: context.usersByRole.students.map((student) => student.id).filter((id) => !allocatedUserIds.has(id)) },
      },
      select: { id: true, email: true },
      orderBy: { id: "asc" },
    });

    const allocationsByTeamId = new Map<number, number[]>();
    for (const allocation of allocations) {
      const current = allocationsByTeamId.get(allocation.teamId) ?? [];
      current.push(allocation.userId);
      allocationsByTeamId.set(allocation.teamId, current);
    }

    const plannedInvites = planTeamInviteSeedData(context.teams, allocationsByTeamId, inviteeUsers);
    if (plannedInvites.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no invite scenarios available)" };
    }

    let changedCount = 0;
    for (const invite of plannedInvites) {
      const existing = await prisma.teamInvite.findUnique({
        where: { tokenHash: invite.tokenHash },
        select: { id: true },
      });

      await prisma.teamInvite.upsert({
        where: { tokenHash: invite.tokenHash },
        update: {
          teamId: invite.teamId,
          inviterId: invite.inviterId,
          inviteeId: invite.inviteeId,
          inviteeEmail: invite.inviteeEmail,
          status: invite.status,
          active: invite.active,
          expiresAt: invite.expiresAt,
          respondedAt: invite.respondedAt,
          message: invite.message,
        },
        create: invite,
      });

      changedCount += existing ? 0 : 1;
    }

    return {
      value: undefined,
      rows: changedCount,
      details: `invite scenarios=${plannedInvites.length}`,
    };
  });
}

export function planTeamInviteSeedData(
  teams: { id: number }[],
  allocationsByTeamId: Map<number, number[]>,
  invitees: { id: number; email: string }[],
) {
  const now = Date.now();
  const pendingInvitees = [...invitees];
  const data: PlannedInvite[] = [];

  for (let index = 0; index < Math.min(SEED_TEAM_INVITES_TOTAL, INVITE_STATUS_SEQUENCE.length, teams.length); index += 1) {
    const team = teams[index];
    if (!team) continue;

    const members = allocationsByTeamId.get(team.id) ?? [];
    const inviterId = members[0];
    const invitee = pendingInvitees[index % pendingInvitees.length];
    if (!inviterId || !invitee) continue;

    const status = INVITE_STATUS_SEQUENCE[index] ?? "PENDING";
    const isResponded = status === "ACCEPTED" || status === "DECLINED";
    const isActive = status === "PENDING";
    const expiresAt = status === "EXPIRED" ? new Date(now - 2 * 24 * 60 * 60 * 1000) : new Date(now + 7 * 24 * 60 * 60 * 1000);

    data.push({
      teamId: team.id,
      inviterId,
      inviteeId: invitee.id,
      inviteeEmail: invitee.email,
      status,
      tokenHash: `seed-team-invite-${team.id}-${invitee.id}-${status.toLowerCase()}`,
      active: isActive,
      expiresAt,
      respondedAt: isResponded ? new Date(now - (index + 1) * 60 * 60 * 1000) : null,
      message: `Seed invite scenario (${status.toLowerCase()}) for team ${team.id}`,
    });
  }

  return data;
}
