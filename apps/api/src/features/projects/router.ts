import { Router } from "express";
import { createProjectHandler,
         getProjectByIdHandler,
         getUserProjectsHandler,
         getProjectDeadlineHandler,
         getTeammatesForProjectHandler,
         getTeamByIdHandler,
         getTeamByUserAndProjectHandler,
         getQuestionsForProjectHandler,
         getStaffProjectsHandler,
         getStaffProjectTeamsHandler,
        } 
from "./controller.js";

const router = Router();
router.post("/", createProjectHandler);
router.get("/staff/mine", getStaffProjectsHandler);
router.get("/staff/:projectId/teams", getStaffProjectTeamsHandler);
router.get("/:projectId", getProjectByIdHandler);
router.get("/", getUserProjectsHandler);
router.get("/:projectId/teammates", getTeammatesForProjectHandler);
router.get("/:projectId/deadline", getProjectDeadlineHandler);
router.get("/:projectId/team", getTeamByUserAndProjectHandler);
router.get("/teams/:teamId", getTeamByIdHandler);
router.get("/:projectId/questions", getQuestionsForProjectHandler);

export default router;
