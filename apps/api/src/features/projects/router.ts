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
} from "./controller.js";

const router = Router();
router.post("/", requireAuth, createProjectHandler);
router.get("/modules", requireAuth, getUserModulesHandler);
router.get("/staff/mine", requireAuth, getStaffProjectsHandler);
router.get("/staff/:projectId/teams", requireAuth, getStaffProjectTeamsHandler);
router.get("/", requireAuth, getUserProjectsHandler);
router.get("/:projectId", requireAuth, getProjectByIdHandler);
router.get("/:projectId/teammates", requireAuth, getTeammatesForProjectHandler);
router.get("/:projectId/deadline", requireAuth, getProjectDeadlineHandler);
router.get("/:projectId/marking", requireAuth, getProjectMarkingHandler);
router.get("/:projectId/team", requireAuth, getTeamByUserAndProjectHandler);
router.get("/teams/:teamId", requireAuth, getTeamByIdHandler);
router.get("/:projectId/questions", requireAuth, getQuestionsForProjectHandler);

export default router;
