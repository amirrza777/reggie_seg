import { Router } from "express";
import {
  getProjectDiscussionPostsHandler,
  createProjectDiscussionPostHandler,
  getProjectDiscussionPostHandler,
  updateProjectDiscussionPostHandler,
  deleteProjectDiscussionPostHandler,
} from "./controller.js";

const router = Router();

router.get("/projects/:projectId/posts", getProjectDiscussionPostsHandler);
router.post("/projects/:projectId/posts", createProjectDiscussionPostHandler);
router.get("/projects/:projectId/posts/:postId", getProjectDiscussionPostHandler);
router.put("/projects/:projectId/posts/:postId", updateProjectDiscussionPostHandler);
router.delete("/projects/:projectId/posts/:postId", deleteProjectDiscussionPostHandler);

export default router;
