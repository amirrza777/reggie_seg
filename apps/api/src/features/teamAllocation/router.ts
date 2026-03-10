import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  createTeamInviteHandler,
  acceptTeamInviteHandler,
  declineTeamInviteHandler,
  rejectTeamInviteHandler,
  cancelTeamInviteHandler,
  expireTeamInviteHandler,
  listTeamInvitesHandler,
  createTeamHandler,
  createTeamForProjectHandler,
  getTeamByIdHandler,
  addUserToTeamHandler,
  getTeamMembersHandler,
} from "./controller.js";

const router = Router();

router.post("/invites", createTeamInviteHandler);
router.patch("/invites/:inviteId/accept", requireAuth, acceptTeamInviteHandler);
router.patch("/invites/:inviteId/decline", declineTeamInviteHandler);
router.patch("/invites/:inviteId/reject", rejectTeamInviteHandler);
router.patch("/invites/:inviteId/cancel", cancelTeamInviteHandler);
router.patch("/invites/:inviteId/expire", expireTeamInviteHandler);
router.get("/teams/:teamId/invites", listTeamInvitesHandler);
router.post("/teams", createTeamHandler);
router.post("/teams/for-project", requireAuth, createTeamForProjectHandler);
router.get("/teams/:teamId", getTeamByIdHandler);
router.post("/teams/:teamId/members", addUserToTeamHandler);
router.get("/teams/:teamId/members", getTeamMembersHandler);

export default router;
