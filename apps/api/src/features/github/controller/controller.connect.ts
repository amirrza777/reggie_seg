import type { Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import { parseSearchQuery } from "../../../shared/search.js";
import {
  buildGithubConnectUrl,
  connectGithubAccount,
  disconnectGithubAccount,
  getGithubConnectionStatus,
  listGithubRepositoriesForUser,
  GithubServiceError,
} from "../service.js";
import { toJsonSafe, withQuery } from "./controller.utils.js";
import { parseGithubCallbackQuery, parseGithubConnectReturnTo } from "./controller.parsers.js";

/** Handles requests for get GitHub connect URL. */
export async function getGithubConnectUrlHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const returnTo = parseGithubConnectReturnTo(req.query.returnTo);
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

/** Handles requests for get GitHub connection status. */
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

/** Handles requests for disconnect GitHub account. */
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

/** Handles requests for GitHub callback. */
export async function githubCallbackHandler(req: AuthRequest, res: Response) {
  const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
  const fallbackPath = "/modules";
  const parsedQuery = parseGithubCallbackQuery(req.query);

  if (!parsedQuery.ok) {
    return res.redirect(`${appBaseUrl}${withQuery(fallbackPath, { github: "error", reason: "missing-code-or-state" })}`);
  }

  try {
    const connected = await connectGithubAccount(parsedQuery.value.code, parsedQuery.value.state);
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

/** Handles requests for list GitHub repos. */
export async function listGithubReposHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const parsedSearchQuery = parseSearchQuery(req.query?.q);
  if (!parsedSearchQuery.ok) {
    return res.status(400).json({ error: parsedSearchQuery.error });
  }

  try {
    const repos = parsedSearchQuery.value
      ? await listGithubRepositoriesForUser(userId, { query: parsedSearchQuery.value })
      : await listGithubRepositoriesForUser(userId);
    return res.json(toJsonSafe({ repos }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error listing GitHub repositories:", error);
    return res.status(500).json({ error: "Failed to list GitHub repositories" });
  }
}
