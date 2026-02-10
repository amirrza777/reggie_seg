import { Router } from "express";
import {
  createTeamInviteHandler,
  listTeamInvitesHandler,
  createTeamHandler,
  getTeamByIdHandler,
  addUserToTeamHandler,
  getTeamMembersHandler,
} from "./controller.js";

const router = Router();

router.post("/invites", createTeamInviteHandler);
router.get("/teams/:teamId/invites", listTeamInvitesHandler);
router.post("/teams", createTeamHandler);
router.get("/teams/:teamId", getTeamByIdHandler);
router.post("/teams/:teamId/members", addUserToTeamHandler);
router.get("/teams/:teamId/members", getTeamMembersHandler);

export default router;
