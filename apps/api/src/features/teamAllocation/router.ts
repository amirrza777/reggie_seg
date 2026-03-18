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
  listReceivedInvitesHandler,
  createTeamHandler,
  createTeamForProjectHandler,
  applyManualAllocationHandler,
  applyRandomAllocationHandler,
  applyCustomAllocationHandler,
  getCustomAllocationCoverageHandler,
  getManualAllocationWorkspaceHandler,
  listAllocationDraftsHandler,
  listCustomAllocationQuestionnairesHandler,
  previewCustomAllocationHandler,
  previewRandomAllocationHandler,
  updateAllocationDraftHandler,
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
router.get("/invites/received", requireAuth, listReceivedInvitesHandler);
router.get("/teams/:teamId/invites", listTeamInvitesHandler);
router.post("/teams", createTeamHandler);
router.post("/teams/for-project", requireAuth, createTeamForProjectHandler);
router.post("/projects/:projectId/random-allocate", requireAuth, applyRandomAllocationHandler);
router.post("/projects/:projectId/manual-allocate", requireAuth, applyManualAllocationHandler);
router.get("/projects/:projectId/random-preview", requireAuth, previewRandomAllocationHandler);
router.get("/projects/:projectId/manual-workspace", requireAuth, getManualAllocationWorkspaceHandler);
router.get("/projects/:projectId/allocation-drafts", requireAuth, listAllocationDraftsHandler);
router.patch(
  "/projects/:projectId/allocation-drafts/:teamId",
  requireAuth,
  updateAllocationDraftHandler,
);
router.get(
  "/projects/:projectId/custom-questionnaires",
  requireAuth,
  listCustomAllocationQuestionnairesHandler,
);
router.get("/projects/:projectId/custom-coverage", requireAuth, getCustomAllocationCoverageHandler);
router.post("/projects/:projectId/custom-preview", requireAuth, previewCustomAllocationHandler);
router.post("/projects/:projectId/custom-allocate", requireAuth, applyCustomAllocationHandler);
router.get("/teams/:teamId", getTeamByIdHandler);
router.post("/teams/:teamId/members", addUserToTeamHandler);
router.get("/teams/:teamId/members", getTeamMembersHandler);

export default router;