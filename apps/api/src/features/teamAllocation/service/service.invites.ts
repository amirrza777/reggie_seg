import crypto from "crypto";
import type { TeamInviteStatus } from "@prisma/client";
import { sendEmail } from "../../../shared/email.js";
import { addNotification } from "../../notifications/service.js";
import { prisma } from "../../../shared/db.js";
import {
  createTeamInviteRecord,
  findActiveInvite,
  findInviteEligibleStudentForTeamByEmail,
  findInviteEligibleStudentsForTeam,
  findInviteContext,
  findPendingInvitesForEmail,
  getInvitesForTeam,
  TeamService,
  updateInviteStatusFromPending,
} from "../repo/repo.js";
import { buildProjectTeamWorkspaceUrl } from "./service.drafts.helpers.js";

const defaultFrontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

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

  const teamRecord = await prisma.team.findUnique({
    where: { id: params.teamId },
    select: { archivedAt: true, allocationLifecycle: true, projectId: true },
  });
  if (!teamRecord) throw { code: "TEAM_NOT_FOUND" };
  if (teamRecord.archivedAt) throw { code: "TEAM_ARCHIVED" };
  if (teamRecord.allocationLifecycle !== "ACTIVE") throw { code: "TEAM_NOT_ACTIVE" };

  const inviterAllocation = await prisma.teamAllocation.findUnique({
    where: { teamId_userId: { teamId: params.teamId, userId: params.inviterId } },
    select: { teamId: true },
  });
  if (!inviterAllocation) throw { code: "TEAM_ACCESS_FORBIDDEN" };

  const eligibleInvitee = await findInviteEligibleStudentForTeamByEmail(params.teamId, normalizedEmail);
  if (!eligibleInvitee) throw { code: "INVITEE_NOT_ELIGIBLE_FOR_PROJECT" };

  const existing = await findActiveInvite(params.teamId, normalizedEmail);
  if (existing) throw { code: "INVITE_ALREADY_PENDING" };

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + (params.expiresInMs ?? 7 * 24 * 60 * 60 * 1000));

  const invite = await createTeamInviteRecord({
    teamId: params.teamId,
    inviterId: params.inviterId,
    inviteeId: eligibleInvitee.id,
    inviteeEmail: normalizedEmail,
    tokenHash,
    expiresAt,
    message: params.message ?? null,
  });

  const { team, inviter } = await findInviteContext(params.teamId, params.inviterId);
  const resolvedBaseUrl = params.baseUrl.trim() || defaultFrontendBaseUrl;
  const invitePageUrl = team?.projectId ? buildProjectTeamWorkspaceUrl(team.projectId, resolvedBaseUrl) : null;
  const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : "A teammate";
  const projectName = team?.project?.name?.trim() || null;

  const textLines = [
    `You have been invited to join "${team?.teamName ?? "a team"}" in Team Feedback.`,
    projectName ? `Project: ${projectName}` : null,
    `Invited by: ${inviterName}`,
    invitePageUrl ? `Review this invite: ${invitePageUrl}` : null,
    params.message?.trim() ? `Message from inviter: ${params.message.trim()}` : null,
    `This invite expires on ${expiresAt.toUTCString()}.`,
    "For privacy, this message does not include personal details about other team members.",
    "You are receiving this because this email address is eligible for the project module.",
    "If you do not recognize this invite, you can ignore this email.",
  ].filter(Boolean);

  try {
    await sendEmail({ to: normalizedEmail, subject: "Team invitation", text: textLines.join("\n") });
  } catch (error) {
    console.error("Failed to send team invitation email; invite was still created.", error);
  }

  const inviteeUserId = params.inviteeId ?? (
    await prisma.user.findFirst({ where: { email: normalizedEmail }, select: { id: true } })
  )?.id;

  if (inviteeUserId) {
    try {
      await addNotification({
        userId: inviteeUserId,
        type: "TEAM_INVITE",
        message: `${inviterName} invited you to join "${team?.teamName ?? "a team"}"`,
        link: `/projects/${team?.projectId}/team`,
      });
    } catch (error) {
      console.error("Failed to create team invitation notification; invite was still created.", error);
    }
  }

  return { invite, rawToken };
}

export async function listTeamInvites(teamId: number, requesterId?: number) {
  const normalizedRequesterId = Number(requesterId);
  const teamRecord = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, archivedAt: true, allocationLifecycle: true },
  });
  if (!teamRecord || teamRecord.archivedAt || teamRecord.allocationLifecycle !== "ACTIVE") {
    throw { code: "TEAM_NOT_FOUND_OR_INACTIVE" };
  }
  if (!Number.isInteger(normalizedRequesterId) || normalizedRequesterId < 1) {
    throw { code: "TEAM_ACCESS_FORBIDDEN" };
  }

  const requesterAllocation = await prisma.teamAllocation.findUnique({
    where: { teamId_userId: { teamId, userId: normalizedRequesterId } },
    select: { teamId: true },
  });
  if (!requesterAllocation) throw { code: "TEAM_ACCESS_FORBIDDEN" };

  return getInvitesForTeam(teamId);
}

export async function listReceivedInvites(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw { code: "USER_NOT_FOUND" };
  return findPendingInvitesForEmail(user.email);
}

async function transitionInviteFromPending(inviteId: string, status: TeamInviteStatus) {
  const invite = await updateInviteStatusFromPending(inviteId, status, new Date());
  if (!invite) throw { code: "INVITE_NOT_PENDING" };
  return invite;
}

export async function acceptTeamInvite(inviteId: string, userId: number) {
  const invite = await transitionInviteFromPending(inviteId, "ACCEPTED");
  await TeamService.addUserToTeam(invite.teamId, userId).catch((err: any) => {
    if (err?.code !== "MEMBER_ALREADY_EXISTS") throw err;
  });
  return invite;
}

export async function declineTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

export async function rejectTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

export async function cancelTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "CANCELLED");
}

export async function expireTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "EXPIRED");
}

export async function listInviteEligibleStudents(teamId: number, requesterId: number) {
  return findInviteEligibleStudentsForTeam(teamId, requesterId);
}