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

const router = Router();
router.post("/", createProjectHandler);
router.get("/modules", getUserModulesHandler);
router.get("/staff/mine", getStaffProjectsHandler);
router.get("/staff/:projectId/teams", getStaffProjectTeamsHandler);
router.get("/staff/:projectId/teams/:teamId/mcf-requests", getStaffTeamMcfRequestsHandler);
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
