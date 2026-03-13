import { Router } from "express";
import {
  getProjectDiscussionPostsHandler,
  createProjectDiscussionPostHandler,
  getProjectDiscussionPostHandler,
  updateProjectDiscussionPostHandler,
  deleteProjectDiscussionPostHandler,
  getForumSettingsHandler,
  updateForumSettingsHandler,
  reportDiscussionPostHandler,
} from "./controller.js";

const router = Router();

router.get("/projects/:projectId/posts", getProjectDiscussionPostsHandler);
router.post("/projects/:projectId/posts", createProjectDiscussionPostHandler);
router.get("/projects/:projectId/posts/:postId", getProjectDiscussionPostHandler);
router.put("/projects/:projectId/posts/:postId", updateProjectDiscussionPostHandler);
router.delete("/projects/:projectId/posts/:postId", deleteProjectDiscussionPostHandler);
router.post("/projects/:projectId/posts/:postId/report", reportDiscussionPostHandler);
router.get("/projects/:projectId/settings", getForumSettingsHandler);
router.put("/projects/:projectId/settings", updateForumSettingsHandler);

export default router;
