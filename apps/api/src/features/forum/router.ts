import { Router } from "express";
import {
  getProjectDiscussionPostsHandler,
  createProjectDiscussionPostHandler,
} from "./controller.js";

const router = Router();

router.get("/projects/:projectId/posts", getProjectDiscussionPostsHandler);
router.post("/projects/:projectId/posts", createProjectDiscussionPostHandler);

export default router;
