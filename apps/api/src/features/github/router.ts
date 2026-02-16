import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { getGithubOAuthConnectUrlHandler, githubOAuthCallbackHandler } from "./controller.js";

const router = Router();

router.get("/oauth/connect", requireAuth, getGithubOAuthConnectUrlHandler);
router.get("/oauth/callback", githubOAuthCallbackHandler);

export default router;
