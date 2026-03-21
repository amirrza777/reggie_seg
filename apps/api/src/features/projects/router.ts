import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  createProjectHandler,
  getProjectByIdHandler,
  getUserProjectsHandler,
  getUserModulesHandler,
  getProjectDeadlineHandler,
  getProjectMarkingHandler,
  getTeammatesForProjectHandler,
  getTeamByIdHandler,
  getTeamByUserAndProjectHandler,
  getQuestionsForProjectHandler,
  getStaffProjectsHandler,
  getStaffProjectTeamsHandler,
  createTeamHealthMessageHandler,
  getMyTeamHealthMessagesHandler,
  getStaffTeamHealthMessagesHandler,
  updateTeamDeadlineProfileHandler,
  getStaffStudentDeadlineOverridesHandler,
  upsertStaffStudentDeadlineOverrideHandler,
  clearStaffStudentDeadlineOverrideHandler,
} from "./controller.js";
import {
  getStaffTeamDeadlineHandler,
  reviewStaffTeamHealthMessageHandler,
  resolveStaffTeamHealthMessageHandler,
} from "./team-health-review/controller.js";

const router = Router();
router.post("/", requireAuth, createProjectHandler);
router.get("/modules", requireAuth, getUserModulesHandler);
router.get("/staff/mine", requireAuth, getStaffProjectsHandler);
router.get("/staff/:projectId/teams", requireAuth, getStaffProjectTeamsHandler);
router.get("/staff/:projectId/teams/:teamId/team-health-messages", requireAuth, getStaffTeamHealthMessagesHandler);
router.get("/staff/:projectId/teams/:teamId/deadline", requireAuth, getStaffTeamDeadlineHandler);
router.patch(
  "/staff/:projectId/teams/:teamId/team-health-messages/:requestId/review",
  requireAuth,
  reviewStaffTeamHealthMessageHandler,
);
router.post(
  "/staff/:projectId/teams/:teamId/team-health-messages/:requestId/deadline-override",
  requireAuth,
  resolveStaffTeamHealthMessageHandler,
);
router.patch("/staff/teams/:teamId/deadline-profile", requireAuth, updateTeamDeadlineProfileHandler);
router.get("/staff/:projectId/students/deadline-overrides", requireAuth, getStaffStudentDeadlineOverridesHandler);
router.put(
  "/staff/:projectId/students/:studentId/deadline-override",
  requireAuth,
  upsertStaffStudentDeadlineOverrideHandler,
);
router.delete(
  "/staff/:projectId/students/:studentId/deadline-override",
  requireAuth,
  clearStaffStudentDeadlineOverrideHandler,
);
router.get("/", requireAuth, getUserProjectsHandler);
router.get("/:projectId", requireAuth, getProjectByIdHandler);
router.post("/:projectId/team-health-messages", requireAuth, createTeamHealthMessageHandler);
router.get("/:projectId/team-health-messages/me", requireAuth, getMyTeamHealthMessagesHandler);
router.get("/:projectId/teammates", requireAuth, getTeammatesForProjectHandler);
router.get("/:projectId/deadline", requireAuth, getProjectDeadlineHandler);
router.get("/:projectId/marking", requireAuth, getProjectMarkingHandler);
router.get("/:projectId/team", requireAuth, getTeamByUserAndProjectHandler);
router.get("/teams/:teamId", requireAuth, getTeamByIdHandler);
router.get("/:projectId/questions", requireAuth, getQuestionsForProjectHandler);

export default router;
