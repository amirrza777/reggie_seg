import { Router } from "express";
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
} from "./controller.js";
import {
  getStaffTeamDeadlineHandler,
  reviewStaffTeamHealthMessageHandler,
  resolveStaffTeamHealthMessageHandler,
} from "./team-health-review/controller.js";

const router = Router();
router.post("/", createProjectHandler);
router.get("/modules", getUserModulesHandler);
router.get("/staff/mine", getStaffProjectsHandler);
router.get("/staff/:projectId/teams", getStaffProjectTeamsHandler);
router.get("/staff/:projectId/teams/:teamId/team-health-messages", getStaffTeamHealthMessagesHandler);
router.get("/staff/:projectId/teams/:teamId/deadline", getStaffTeamDeadlineHandler);
router.patch("/staff/:projectId/teams/:teamId/team-health-messages/:requestId/review", reviewStaffTeamHealthMessageHandler);
router.post(
  "/staff/:projectId/teams/:teamId/team-health-messages/:requestId/deadline-override",
  resolveStaffTeamHealthMessageHandler
);
router.get("/", getUserProjectsHandler);
router.get("/:projectId", getProjectByIdHandler);
router.post("/:projectId/team-health-messages", createTeamHealthMessageHandler);
router.get("/:projectId/team-health-messages/me", getMyTeamHealthMessagesHandler);
router.get("/:projectId/teammates", getTeammatesForProjectHandler);
router.get("/:projectId/deadline", getProjectDeadlineHandler);
router.get("/:projectId/marking", getProjectMarkingHandler);
router.get("/:projectId/team", getTeamByUserAndProjectHandler);
router.get("/teams/:teamId", getTeamByIdHandler);
router.get("/:projectId/questions", getQuestionsForProjectHandler);

export default router;
