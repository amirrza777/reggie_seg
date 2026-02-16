import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { getGithubOAuthConnectUrlHandler, githubOAuthCallbackHandler, listGithubReposHandler } from "./controller.js";

const router = Router();

router.get("/oauth/connect", requireAuth, getGithubOAuthConnectUrlHandler);
router.get("/oauth/callback", githubOAuthCallbackHandler);
router.get("/repos", requireAuth, listGithubReposHandler);

export default router;
