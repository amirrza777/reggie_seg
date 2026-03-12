import crypto from "crypto";
import type { TeamInviteStatus } from "@prisma/client";
import { sendEmail } from "../../shared/email.js";
import { addNotification } from "../notifications/service.js";
import { prisma } from "../../shared/db.js";
import {
  createTeamInviteRecord,
  findActiveInvite,
  findInviteContext,
  findPendingInvitesForEmail,
  getInvitesForTeam,
  TeamService,
  updateInviteStatusFromPending,
} from "./repo.js";

type CreateTeamInviteParams = {
  teamId: number;
  inviterId: number;
  inviteeEmail: string;
  inviteeId?: number;
  message?: string;
  baseUrl: string;
  expiresInMs?: number;
};

export async function createTeamInvite(params: CreateTeamInviteParams) {
  const normalizedEmail = params.inviteeEmail.trim().toLowerCase();
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

  const inviteeUserId = params.inviteeId ?? (
    await prisma.user.findFirst({ where: { email: normalizedEmail }, select: { id: true } })
  )?.id;

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

export async function listTeamInvites(teamId: number) {
  return getInvitesForTeam(teamId);
}

export async function listReceivedInvites(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw { code: "USER_NOT_FOUND" };
  return findPendingInvitesForEmail(user.email);
}

export async function createTeam(userId: number, teamData: Parameters<typeof TeamService.createTeam>[1]) {
  return TeamService.createTeam(userId, teamData);
}

export async function createTeamForProject(userId: number, projectId: number, teamName: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { enterpriseId: true } });
  if (!user) throw { code: "USER_NOT_FOUND" };
  return TeamService.createTeam(userId, { enterpriseId: user.enterpriseId, projectId, teamName });
}

export async function getTeamById(teamId: number) {
  return TeamService.getTeamById(teamId);
}

export async function addUserToTeam(teamId: number, userId: number, role: "OWNER" | "MEMBER" = "MEMBER") {
  return TeamService.addUserToTeam(teamId, userId, role);
}

export async function getTeamMembers(teamId: number) {
  return TeamService.getTeamMembers(teamId);
}

async function transitionInviteFromPending(inviteId: string, status: TeamInviteStatus) {
  const invite = await updateInviteStatusFromPending(inviteId, status, new Date());

  if (!invite) {
    throw { code: "INVITE_NOT_PENDING" };
  }

  return invite;
}

export async function acceptTeamInvite(inviteId: string, userId: number) {
  const invite = await transitionInviteFromPending(inviteId, "ACCEPTED");
  // Add the accepting user to the team; ignore if already a member.
  await TeamService.addUserToTeam(invite.teamId, userId).catch((err: any) => {
    if (err?.code !== "MEMBER_ALREADY_EXISTS") throw err;
  });
  return invite;
}

export async function declineTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

// "REJECTED" is treated as an alias of DECLINED in current schema.
export async function rejectTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

export async function cancelTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "CANCELLED");
}

export async function expireTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "EXPIRED");
}
