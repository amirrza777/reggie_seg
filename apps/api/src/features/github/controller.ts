import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { buildGithubOAuthConnectUrl, GithubServiceError, validateGithubOAuthCallback } from "./service.js";

export async function getGithubOAuthConnectUrlHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const url = await buildGithubOAuthConnectUrl(userId);
    return res.json({ url });
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error building GitHub OAuth URL:", error);
    return res.status(500).json({ error: "Failed to build GitHub OAuth URL" });
  }
}

export async function githubOAuthCallbackHandler(req: AuthRequest, res: Response) {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  try {
    const validated = validateGithubOAuthCallback(code, state);
    return res.status(501).json({
      error: "GitHub token exchange is not implemented yet",
      callback: validated,
    });
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error validating GitHub OAuth callback:", error);
    return res.status(500).json({ error: "Failed to validate GitHub OAuth callback" });
  }
}
