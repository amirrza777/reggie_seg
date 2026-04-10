import type { Prisma, TeamInviteStatus } from "@prisma/client";
import { prisma } from "../../../shared/db.js";

export async function findActiveInvite(teamId: number, inviteeEmail: string) {
  return prisma.teamInvite.findFirst({
    where: {
      teamId,
      inviteeEmail,
      active: true,
      status: "PENDING",
      team: {
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
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
      select: { teamName: true, projectId: true, project: { select: { name: true } } },
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
    include: {
      inviter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function findPendingInvitesForEmail(email: string) {
  return prisma.teamInvite.findMany({
    where: {
      inviteeEmail: email,
      status: "PENDING",
      active: true,
      team: {
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
    include: {
      team: { select: { id: true, teamName: true, projectId: true } },
      inviter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateInviteStatusFromPending(
  inviteId: string,
  status: TeamInviteStatus,
  now: Date,
) {
  const transitionWhere: Prisma.TeamInviteWhereInput = {
    id: inviteId,
    status: "PENDING",
    active: true,
    team: {
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
    },
  };
  const targetInvite = await prisma.teamInvite.findFirst({
    where: transitionWhere,
    select: {
      id: true,
      teamId: true,
      inviteeEmail: true,
    },
  });
  if (!targetInvite) {
    return null;
  }

  // Historical rows may already occupy (teamId, inviteeEmail, active=false).
  // Remove stale inactive duplicates so the pending invite can transition safely.
  await prisma.teamInvite.deleteMany({
    where: {
      teamId: targetInvite.teamId,
      inviteeEmail: targetInvite.inviteeEmail,
      active: false,
      id: { not: targetInvite.id },
    },
  });

  const result = await prisma.teamInvite.updateMany({
    where: transitionWhere,
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
    where: { id: targetInvite.id },
  });
}