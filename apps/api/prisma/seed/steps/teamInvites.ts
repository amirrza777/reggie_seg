import { TeamInviteStatus } from "@prisma/client";
import { withSeedLogging } from "../logging";
import { prisma } from "../prismaClient";
import type { SeedContext } from "../types";
import { SEED_TEAM_INVITES_TOTAL } from "../volumes";

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
    if (!isTeamInviteSeedReady(context)) return buildTeamInviteSeedSkipResult("insufficient teams/students");

    const allocations = await findTeamAllocations(context.teams.map((team) => team.id));
    const inviteeUsers = await findInviteeUsers(context, allocations);
    const allocationsByTeamId = buildAllocationsByTeamId(allocations);
    const plannedInvites = planTeamInviteSeedData(context.teams, allocationsByTeamId, inviteeUsers);
    if (plannedInvites.length === 0) return buildTeamInviteSeedSkipResult("no invite scenarios available");

    const changedCount = await upsertPlannedTeamInvites(plannedInvites);

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
  const limit = resolveInvitePlanningLimit(teams.length);

  for (let index = 0; index < limit; index += 1) {
    const team = teams[index];
    if (!team) continue;

    const inviterId = resolveInviterId(allocationsByTeamId.get(team.id) ?? []);
    const invitee = pendingInvitees[index % pendingInvitees.length];
    if (!inviterId || !invitee) continue;

    const status = INVITE_STATUS_SEQUENCE[index];
    data.push(buildPlannedInvite(team, inviterId, invitee, status, index, now));
  }

  return data;
}

function resolveInvitePlanningLimit(teamsLength: number) {
  return Math.min(SEED_TEAM_INVITES_TOTAL, INVITE_STATUS_SEQUENCE.length, teamsLength);
}

function resolveInviterId(members: number[]) {
  return members[0];
}

function resolveInviteFlags(status: TeamInviteStatus) {
  return {
    isResponded: status === "ACCEPTED" || status === "DECLINED",
    isActive: status === "PENDING",
  };
}

function resolveInviteTiming(status: TeamInviteStatus, index: number, now: number) {
  const expiresAt = status === "EXPIRED"
    ? new Date(now - 2 * 24 * 60 * 60 * 1000)
    : new Date(now + 7 * 24 * 60 * 60 * 1000);
  const respondedAt = resolveInviteFlags(status).isResponded ? new Date(now - (index + 1) * 60 * 60 * 1000) : null;
  return { expiresAt, respondedAt };
}

function buildPlannedInvite(
  team: { id: number },
  inviterId: number,
  invitee: { id: number; email: string },
  status: TeamInviteStatus,
  index: number,
  now: number,
): PlannedInvite {
  const flags = resolveInviteFlags(status);
  const timing = resolveInviteTiming(status, index, now);
  return {
    teamId: team.id,
    inviterId,
    inviteeId: invitee.id,
    inviteeEmail: invitee.email,
    status,
    tokenHash: `seed-team-invite-${team.id}-${invitee.id}-${status.toLowerCase()}`,
    active: flags.isActive,
    expiresAt: timing.expiresAt,
    respondedAt: timing.respondedAt,
    message: `Seed invite scenario (${status.toLowerCase()}) for team ${team.id}`,
  };
}

function isTeamInviteSeedReady(context: SeedContext) {
  return context.teams.length > 0 && context.usersByRole.students.length >= 3;
}

function buildTeamInviteSeedSkipResult(reason: string) {
  return { value: undefined, rows: 0, details: `skipped (${reason})` };
}

function findTeamAllocations(teamIds: number[]) {
  return prisma.teamAllocation.findMany({
    where: { teamId: { in: teamIds } },
    select: { teamId: true, userId: true },
    orderBy: [{ teamId: "asc" }, { userId: "asc" }],
  });
}

function buildAllocationsByTeamId(allocations: { teamId: number; userId: number }[]) {
  const byTeam = new Map<number, number[]>();
  for (const allocation of allocations) {
    const current = byTeam.get(allocation.teamId) ?? [];
    current.push(allocation.userId);
    byTeam.set(allocation.teamId, current);
  }
  return byTeam;
}

function findInviteeUsers(context: SeedContext, allocations: { teamId: number; userId: number }[]) {
  const allocatedUserIds = new Set(allocations.map((allocation) => allocation.userId));
  const unallocatedStudentIds = context.usersByRole.students
    .map((student) => student.id)
    .filter((id) => !allocatedUserIds.has(id));
  return prisma.user.findMany({
    where: { id: { in: unallocatedStudentIds } },
    select: { id: true, email: true },
    orderBy: { id: "asc" },
  });
}

async function upsertPlannedTeamInvites(plannedInvites: PlannedInvite[]) {
  let changedCount = 0;
  for (const invite of plannedInvites) {
    const existing = await prisma.teamInvite.findUnique({
      where: { tokenHash: invite.tokenHash },
      select: { id: true },
    });
    await prisma.teamInvite.upsert({
      where: { tokenHash: invite.tokenHash },
      update: buildTeamInviteUpdate(invite),
      create: invite,
    });
    changedCount += existing ? 0 : 1;
  }
  return changedCount;
}

function buildTeamInviteUpdate(invite: PlannedInvite) {
  return {
    teamId: invite.teamId,
    inviterId: invite.inviterId,
    inviteeId: invite.inviteeId,
    inviteeEmail: invite.inviteeEmail,
    status: invite.status,
    active: invite.active,
    expiresAt: invite.expiresAt,
    respondedAt: invite.respondedAt,
    message: invite.message,
  };
}
