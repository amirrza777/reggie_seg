import type { Request, Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import {
  acceptTeamInvite,
  cancelTeamInvite,
  createTeamInvite,
  declineTeamInvite,
  expireTeamInvite,
  listInviteEligibleStudents,
  listReceivedInvites,
  listTeamInvites,
  rejectTeamInvite,
} from "../service/service.js";
import {
  parseCreateTeamInviteBody,
  parseInviteIdParam,
  parseStaffActor,
  parseTeamIdParam,
} from "./controller.parsers.js";

export async function createTeamInviteHandler(req: AuthRequest, res: Response) {
  const inviterId = parseStaffActor(req);
  if (!inviterId.ok) return res.status(401).json({ error: inviterId.error });
  const parsedBody = parseCreateTeamInviteBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const host = req.get("host");
  const baseUrl = origin ?? (host ? `${req.protocol}://${host}` : "");

  try {
    const result = await createTeamInvite({
      teamId: parsedBody.value.teamId,
      inviterId: inviterId.value,
      inviteeEmail: parsedBody.value.inviteeEmail,
      baseUrl,
      ...(parsedBody.value.inviteeId !== undefined ? { inviteeId: parsedBody.value.inviteeId } : {}),
      ...(parsedBody.value.message !== undefined ? { message: parsedBody.value.message } : {}),
    });
    return res.json({ ok: true, inviteId: result.invite.id });
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    if (error?.code === "TEAM_ARCHIVED") {
      return res.status(409).json({ error: "This team is archived and cannot accept new invites" });
    }
    if (error?.code === "TEAM_NOT_ACTIVE") {
      return res.status(409).json({ error: "Draft teams cannot send invites until approved" });
    }
    if (error?.code === "TEAM_ACCESS_FORBIDDEN") {
      return res.status(403).json({ error: "You are not a member of this team" });
    }
    if (error?.code === "INVITE_ALREADY_PENDING") {
      return res.status(409).json({ error: "Invite already pending" });
    }
    if (error?.code === "INVITEE_NOT_ELIGIBLE_FOR_PROJECT") {
      return res.status(400).json({ error: "Only students assigned to this module can be invited" });
    }
    if (error?.code === "TEAM_INVITE_DEADLINE_PASSED") {
      return res.status(409).json({ error: "The deadline for sending team invites has passed" });
    }
    console.error("Error creating team invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listInviteEligibleStudentsHandler(req: AuthRequest, res: Response) {
  const requesterId = parseStaffActor(req);
  if (!requesterId.ok) return res.status(401).json({ error: requesterId.error });
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });

  try {
    const students = await listInviteEligibleStudents(teamId.value, requesterId.value);
    return res.json(students);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND_OR_INACTIVE") {
      return res.status(404).json({ error: "Team not found" });
    }
    if (error?.code === "TEAM_ACCESS_FORBIDDEN") {
      return res.status(403).json({ error: "You are not allowed to view invite options for this team" });
    }
    console.error("Error fetching invite-eligible students:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listTeamInvitesHandler(req: AuthRequest, res: Response) {
  const requesterId = parseStaffActor(req);
  if (!requesterId.ok) return res.status(401).json({ error: requesterId.error });
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });

  try {
    const invites = await listTeamInvites(teamId.value, requesterId.value);
    return res.json(invites);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND_OR_INACTIVE") {
      return res.status(404).json({ error: "Team not found" });
    }
    if (error?.code === "TEAM_ACCESS_FORBIDDEN") {
      return res.status(403).json({ error: "You are not allowed to view invites for this team" });
    }
    console.error("Error fetching team invites:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listReceivedInvitesHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const invites = await listReceivedInvites(userId);
    return res.json(invites);
  } catch (error: any) {
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error fetching received invites:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function transitionInviteHandler(
  req: Request,
  res: Response,
  transition: (inviteId: string) => Promise<unknown>,
  actionName: string,
) {
  const inviteId = parseInviteIdParam(req.params.inviteId);
  if (!inviteId.ok) return res.status(400).json({ error: inviteId.error });

  try {
    const invite = await transition(inviteId.value);
    return res.json({ ok: true, invite });
  } catch (error: any) {
    if (error?.code === "INVITE_NOT_PENDING") {
      return res.status(409).json({ error: "Invite is not pending" });
    }
    console.error(`Error ${actionName} team invite:`, error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function acceptTeamInviteHandler(req: AuthRequest, res: Response) {
  const inviteId = parseInviteIdParam(req.params.inviteId);
  if (!inviteId.ok) return res.status(400).json({ error: inviteId.error });
  const userId = parseStaffActor(req);
  if (!userId.ok) return res.status(401).json({ error: userId.error });

  try {
    const invite = await acceptTeamInvite(inviteId.value, userId.value);
    return res.json({ ok: true, invite });
  } catch (error: any) {
    if (error?.code === "INVITE_NOT_PENDING") {
      return res.status(409).json({ error: "Invite is not pending" });
    }
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(409).json({ error: "This team is no longer active" });
    }
    console.error("Error accepting team invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function declineTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, declineTeamInvite, "declining");
}

export async function rejectTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, rejectTeamInvite, "rejecting");
}

export async function cancelTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, cancelTeamInvite, "cancelling");
}

export async function expireTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, expireTeamInvite, "expiring");
}