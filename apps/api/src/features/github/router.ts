import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  getGithubOAuthConnectUrlHandler,
  githubOAuthCallbackHandler,
  linkGithubProjectRepoHandler,
  listGithubReposHandler,
} from "./controller.js";

const router = Router();

router.get("/oauth/connect", requireAuth, getGithubOAuthConnectUrlHandler);
router.get("/oauth/callback", githubOAuthCallbackHandler);
router.get("/repos", requireAuth, listGithubReposHandler);
router.post("/project-repos", requireAuth, linkGithubProjectRepoHandler);

export default router;
