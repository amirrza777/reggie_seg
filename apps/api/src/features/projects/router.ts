import { Router } from "express";
import { createProjectHandler,
         getProjectByIdHandler,
         getUserProjectsHandler,
         getProjectDeadlineHandler,
         getTeammatesForProjectHandler} 
from "./controller.js";

const router = Router();
router.post("/", createProjectHandler);
router.get("/:projectId", getProjectByIdHandler);
router.get("/", getUserProjectsHandler);
router.get("/:projectId/teammates", getTeammatesForProjectHandler);
router.get("/:projectId/deadline", getProjectDeadlineHandler);

export default router;
