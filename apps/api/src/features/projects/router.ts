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
  createMcfRequestHandler,
  getMyMcfRequestsHandler,
  getStaffTeamMcfRequestsHandler,
} from "./controller.js";
import {
  getStaffTeamDeadlineHandler,
  reviewStaffTeamMcfRequestHandler,
  resolveStaffTeamMcfRequestHandler,
} from "./mcf-review/controller.js";

const router = Router();
router.post("/", createProjectHandler);
router.get("/modules", getUserModulesHandler);
router.get("/staff/mine", getStaffProjectsHandler);
router.get("/staff/:projectId/teams", getStaffProjectTeamsHandler);
router.get("/staff/:projectId/teams/:teamId/mcf-requests", getStaffTeamMcfRequestsHandler);
router.get("/staff/:projectId/teams/:teamId/deadline", getStaffTeamDeadlineHandler);
router.patch("/staff/:projectId/teams/:teamId/mcf-requests/:requestId/review", reviewStaffTeamMcfRequestHandler);
router.post(
  "/staff/:projectId/teams/:teamId/mcf-requests/:requestId/deadline-override",
  resolveStaffTeamMcfRequestHandler
);
router.get("/", getUserProjectsHandler);
router.get("/:projectId", getProjectByIdHandler);
router.post("/:projectId/mcf-requests", createMcfRequestHandler);
router.get("/:projectId/mcf-requests/me", getMyMcfRequestsHandler);
router.get("/:projectId/teammates", getTeammatesForProjectHandler);
router.get("/:projectId/deadline", getProjectDeadlineHandler);
router.get("/:projectId/marking", getProjectMarkingHandler);
router.get("/:projectId/team", getTeamByUserAndProjectHandler);
router.get("/teams/:teamId", getTeamByIdHandler);
router.get("/:projectId/questions", getQuestionsForProjectHandler);

export default router;
