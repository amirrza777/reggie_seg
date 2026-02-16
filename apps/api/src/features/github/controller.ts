import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { buildGithubOAuthConnectUrl, connectGithubAccount, GithubServiceError, listGithubRepositoriesForUser } from "./service.js";

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
    const account = await connectGithubAccount(code, state);
    return res.json({
      connected: true,
      account,
    });
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error validating GitHub OAuth callback:", error);
    return res.status(500).json({ error: "Failed to validate GitHub OAuth callback" });
  }
}

export async function listGithubReposHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const repos = await listGithubRepositoriesForUser(userId);
    return res.json({ repos });
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error listing GitHub repositories:", error);
    return res.status(500).json({ error: "Failed to list GitHub repositories" });
  }
}
