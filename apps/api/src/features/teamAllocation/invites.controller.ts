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

/** Handles requests for create team invite. */
export async function createTeamInviteHandler(req: Request, res: Response) {
  const teamId = Number(req.body?.teamId);
  const inviterId = Number(req.body?.inviterId);
  const inviteeEmail = typeof req.body?.inviteeEmail === "string" ? req.body.inviteeEmail : "";
  const inviteeId = req.body?.inviteeId ? Number(req.body.inviteeId) : undefined;
  const message = typeof req.body?.message === "string" ? req.body.message : undefined;

  if (isNaN(teamId) || isNaN(inviterId) || !inviteeEmail) {
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
    if (error?.code === "TEAM_ARCHIVED") {
      return res.status(409).json({ error: "This team is archived and cannot accept new invites" });
    }
    if (error?.code === "INVITE_ALREADY_PENDING") {
      return res.status(409).json({ error: "Invite already pending" });
    }
    console.error("Error creating team invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for list team invites. */
export async function listTeamInvitesHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const invites = await listTeamInvites(teamId);
    return res.json(invites);
  } catch (error) {
    console.error("Error fetching team invites:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for list invites received by the authenticated user. */
export async function listReceivedInvitesHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const invites = await listReceivedInvites(userId);
    return res.json(invites);
  } catch (error) {
    console.error("Error fetching received team invites:", error);
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

/** Handles requests for accept team invite. */
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
    console.error("Error accepting team invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for decline team invite. */
export async function declineTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, declineTeamInvite, "declining");
}

/** Handles requests for reject team invite. */
export async function rejectTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, rejectTeamInvite, "rejecting");
}

/** Handles requests for cancel team invite. */
export async function cancelTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, cancelTeamInvite, "cancelling");
}

/** Handles requests for expire team invite. */
export async function expireTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, expireTeamInvite, "expiring");
}
