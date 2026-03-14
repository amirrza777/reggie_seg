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
  updateTeamDeadlineProfileHandler,
  getStaffStudentDeadlineOverridesHandler,
  upsertStaffStudentDeadlineOverrideHandler,
  clearStaffStudentDeadlineOverrideHandler,
} from "./controller.js";

const router = Router();
router.post("/", requireAuth, createProjectHandler);
router.get("/modules", getUserModulesHandler);
router.get("/staff/mine", getStaffProjectsHandler);
router.get("/staff/:projectId/teams", getStaffProjectTeamsHandler);
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
router.get("/", getUserProjectsHandler);
router.get("/:projectId", getProjectByIdHandler);
router.get("/:projectId/teammates", getTeammatesForProjectHandler);
router.get("/:projectId/deadline", getProjectDeadlineHandler);
router.get("/:projectId/marking", getProjectMarkingHandler);
router.get("/:projectId/team", getTeamByUserAndProjectHandler);
router.get("/teams/:teamId", getTeamByIdHandler);
router.get("/:projectId/questions", getQuestionsForProjectHandler);

export default router;
