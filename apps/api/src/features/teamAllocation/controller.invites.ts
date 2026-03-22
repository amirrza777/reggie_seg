import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  acceptTeamInvite,
  cancelTeamInvite,
  createTeamInvite,
  declineTeamInvite,
  expireTeamInvite,
  listReceivedInvites,
  listTeamInvites,
  rejectTeamInvite,
} from "./service.js";

export async function createTeamInviteHandler(req: AuthRequest, res: Response) {
  const teamId = Number(req.body?.teamId);
  const inviterId = req.user?.sub;
  const inviteeEmail = typeof req.body?.inviteeEmail === "string" ? req.body.inviteeEmail : "";
  const inviteeId = req.body?.inviteeId ? Number(req.body.inviteeId) : undefined;
  const message = typeof req.body?.message === "string" ? req.body.message : undefined;

  if (!inviterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (isNaN(teamId) || !inviteeEmail) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const host = req.get("host");
  const baseUrl = origin ?? (host ? `${req.protocol}://${host}` : "");

  try {
    const result = await createTeamInvite({
      teamId,
      inviterId,
      inviteeEmail,
      baseUrl,
      ...(inviteeId !== undefined ? { inviteeId } : {}),
      ...(message !== undefined ? { message } : {}),
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
    console.error("Error creating team invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listTeamInvitesHandler(req: AuthRequest, res: Response) {
  const requesterId = req.user?.sub;
  const teamId = Number(req.params.teamId);
  if (!requesterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const invites = await listTeamInvites(teamId, requesterId);
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
  const inviteId = typeof req.params.inviteId === "string" ? req.params.inviteId.trim() : "";
  if (!inviteId) {
    return res.status(400).json({ error: "Invalid invite ID" });
  }

  try {
    const invite = await transition(inviteId);
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
  const inviteId = typeof req.params.inviteId === "string" ? req.params.inviteId.trim() : "";
  const userId = req.user?.sub;

  if (!inviteId) {
    return res.status(400).json({ error: "Invalid invite ID" });
  }
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const invite = await acceptTeamInvite(inviteId, userId);
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