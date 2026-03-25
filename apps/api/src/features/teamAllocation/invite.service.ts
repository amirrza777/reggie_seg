import crypto from "crypto";
import type { TeamInviteStatus } from "@prisma/client";
import { sendEmail } from "../../shared/email.js";
import { prisma } from "../../shared/db.js";
import { addNotification } from "../notifications/service.js";
import {
  createTeamInviteRecord,
  findActiveInvite,
  findInviteContext,
  findPendingInvitesForEmail,
  getInvitesForTeam,
  updateInviteStatusFromPending,
} from "./repo.js";
import { addUserToTeam } from "./team.service.js";

type CreateTeamInviteParams = {
  teamId: number;
  inviterId: number;
  inviteeEmail: string;
  inviteeId?: number;
  message?: string;
  baseUrl: string;
  expiresInMs?: number;
};

async function findTeamArchiveStatus(teamId: number) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: { archivedAt: true },
  });
}

async function findUserEmailById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
}

async function findUserIdByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
}

/** Creates a team invite. */
export async function createTeamInvite(params: CreateTeamInviteParams) {
  const normalizedEmail = params.inviteeEmail.trim().toLowerCase();

  const teamRecord = await findTeamArchiveStatus(params.teamId);
  if (teamRecord?.archivedAt) throw { code: "TEAM_ARCHIVED" };

  const existing = await findActiveInvite(params.teamId, normalizedEmail);
  if (existing) {
    throw { code: "INVITE_ALREADY_PENDING" };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + (params.expiresInMs ?? 7 * 24 * 60 * 60 * 1000));

  const invite = await createTeamInviteRecord({
    teamId: params.teamId,
    inviterId: params.inviterId,
    inviteeId: params.inviteeId ?? null,
    inviteeEmail: normalizedEmail,
    tokenHash,
    expiresAt,
    message: params.message ?? null,
  });

  const { team, inviter } = await findInviteContext(params.teamId, params.inviterId);

  const textLines = [
    `You have been invited by ${inviter?.firstName ?? "a teammate"} ${
      inviter?.lastName ?? ""
    } (${inviter?.email ?? "unknown"}) to join the team "${
      team?.teamName ?? "Unknown Team"
    }".`,
    "Please log in to your account and RSVP to this invite.",
  ].filter(Boolean);

  await sendEmail({
    to: normalizedEmail,
    subject: "Team invitation",
    text: textLines.join("\n"),
  });

  const inviteeUserId = params.inviteeId ?? (await findUserIdByEmail(normalizedEmail))?.id;

  if (inviteeUserId) {
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : "A teammate";
    await addNotification({
      userId: inviteeUserId,
      type: "TEAM_INVITE",
      message: `${inviterName} invited you to join "${team?.teamName ?? "a team"}"`,
      link: `/projects/${team?.projectId}/team`,
    });
  }

  return { invite, rawToken };
}

/** Returns the team invites. */
export async function listTeamInvites(teamId: number) {
  return getInvitesForTeam(teamId);
}

/** Returns the pending invites addressed to the authenticated user. */
export async function listReceivedInvites(userId: number) {
  const user = await findUserEmailById(userId);
  const normalizedEmail = user?.email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return findPendingInvitesForEmail(normalizedEmail);
}

async function transitionInviteFromPending(inviteId: string, status: TeamInviteStatus) {
  const invite = await updateInviteStatusFromPending(inviteId, status, new Date());

  if (!invite) {
    throw { code: "INVITE_NOT_PENDING" };
  }

  return invite;
}

/** Accepts the team invite. */
export async function acceptTeamInvite(inviteId: string, userId: number) {
  const invite = await transitionInviteFromPending(inviteId, "ACCEPTED");
  await addUserToTeam(invite.teamId, userId).catch((err: any) => {
    if (err?.code !== "MEMBER_ALREADY_EXISTS") throw err;
  });
  return invite;
}

/** Declines the team invite. */
export async function declineTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

/** Rejects the team invite. */
export async function rejectTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

/** Cancels the team invite. */
export async function cancelTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "CANCELLED");
}

/** Expires the team invite. */
export async function expireTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "EXPIRED");
}