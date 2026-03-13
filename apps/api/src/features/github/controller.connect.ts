import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  buildGithubConnectUrl,
  connectGithubAccount,
  disconnectGithubAccount,
  getGithubConnectionStatus,
  listGithubRepositoriesForUser,
  GithubServiceError,
} from "./service.js";
import { toJsonSafe, withQuery } from "./controller.utils.js";

export async function getGithubConnectUrlHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : null;
    const url = await buildGithubConnectUrl(userId, returnTo);
    return res.json({ url });
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error building GitHub connect URL:", error);
    return res.status(500).json({ error: "Failed to build GitHub connect URL" });
  }
}

export async function getGithubConnectionStatusHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const status = await getGithubConnectionStatus(userId);
    return res.json(toJsonSafe(status));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching GitHub connection status:", error);
    return res.status(500).json({ error: "Failed to fetch GitHub connection status" });
  }
}

export async function disconnectGithubAccountHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await disconnectGithubAccount(userId);
    return res.json(toJsonSafe(result));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error disconnecting GitHub account:", error);
    return res.status(500).json({ error: "Failed to disconnect GitHub account" });
  }
}

export async function githubCallbackHandler(req: AuthRequest, res: Response) {
  const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
  const fallbackPath = "/modules";
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");

  if (!code || !state) {
    return res.redirect(`${appBaseUrl}${withQuery(fallbackPath, { github: "error", reason: "missing-code-or-state" })}`);
  }

  try {
    const connected = await connectGithubAccount(code, state);
    const returnPath = connected.returnTo || fallbackPath;
    const target = returnPath.startsWith("http://") || returnPath.startsWith("https://")
      ? withQuery(returnPath, { github: "connected" })
      : `${appBaseUrl}${withQuery(returnPath, { github: "connected" })}`;
    return res.redirect(target);
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.redirect(
        `${appBaseUrl}${withQuery(fallbackPath, { github: "error", reason: error.message })}`
      );
    }
    console.error("Error validating GitHub callback:", error);
    return res.redirect(`${appBaseUrl}${withQuery(fallbackPath, { github: "error", reason: "callback-failed" })}`);
  }
}

export async function listGithubReposHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const repos = await listGithubRepositoriesForUser(userId);
    return res.json(toJsonSafe({ repos }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error listing GitHub repositories:", error);
    return res.status(500).json({ error: "Failed to list GitHub repositories" });
  }
}
