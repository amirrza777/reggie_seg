import { Router } from "express";
import { createProjectHandler,
         getProjectByIdHandler,
         getUserProjectsHandler,
         getUserModulesHandler,
         getProjectDeadlineHandler,
         getTeammatesForProjectHandler,
         getTeamByIdHandler,
         getTeamByUserAndProjectHandler,
         getQuestionsForProjectHandler
        } 
from "./controller.js";

const router = Router();
router.post("/", createProjectHandler);
router.get("/modules", getUserModulesHandler);
router.get("/", getUserProjectsHandler);
router.get("/:projectId", getProjectByIdHandler);
router.get("/:projectId/teammates", getTeammatesForProjectHandler);
router.get("/:projectId/deadline", getProjectDeadlineHandler);
router.get("/:projectId/team", getTeamByUserAndProjectHandler);
router.get("/teams/:teamId", getTeamByIdHandler);
router.get("/:projectId/questions", getQuestionsForProjectHandler);

export default router;
