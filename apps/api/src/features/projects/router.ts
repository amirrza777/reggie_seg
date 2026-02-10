import { Router } from "express";
import { createProjectHandler, getProjectByIdHandler, getUserProjectsHandler } from "./controller.js";

const router = Router();
router.post("/", createProjectHandler);
router.get("/:projectId", getProjectByIdHandler);
router.get("/", getUserProjectsHandler);

export default router;
