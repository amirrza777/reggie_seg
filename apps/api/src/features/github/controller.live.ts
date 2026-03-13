import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  listLiveProjectGithubRepositoryBranchCommits,
  listLiveProjectGithubRepositoryBranches,
  listLiveProjectGithubRepositoryMyCommits,
  updateProjectGithubSyncSettings,
  GithubServiceError,
} from "./service.js";
import { toJsonSafe } from "./controller.utils.js";

export async function listLiveProjectGithubRepoBranchesHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  try {
    const branchData = await listLiveProjectGithubRepositoryBranches(userId, linkId);
    return res.json(toJsonSafe(branchData));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching live project GitHub branches:", error);
    return res.status(500).json({ error: "Failed to fetch live project GitHub branches" });
  }
}

export async function listLiveProjectGithubRepoBranchCommitsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  const branch =
    typeof req.query.branch === "string" && req.query.branch.trim().length > 0
      ? req.query.branch.trim()
      : null;
  if (!branch) {
    return res.status(400).json({ error: "branch query param is required" });
  }

  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 10;
  if (Number.isNaN(limit)) {
    return res.status(400).json({ error: "limit query param must be a number" });
  }

  try {
    const commitData = await listLiveProjectGithubRepositoryBranchCommits(userId, linkId, branch, limit);
    return res.json(toJsonSafe(commitData));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching live branch commits:", error);
    return res.status(500).json({ error: "Failed to fetch live branch commits" });
  }
}

export async function listLiveProjectGithubRepoMyCommitsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  const page = typeof req.query.page === "string" ? Number(req.query.page) : 1;
  const perPage = typeof req.query.perPage === "string" ? Number(req.query.perPage) : 10;
  const includeTotals = req.query.includeTotals === "false" ? false : true;
  if (Number.isNaN(page) || Number.isNaN(perPage)) {
    return res.status(400).json({ error: "page and perPage query params must be numbers" });
  }

  try {
    const commitData = await listLiveProjectGithubRepositoryMyCommits(userId, linkId, page, perPage, { includeTotals });
    return res.json(toJsonSafe(commitData));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching live my commits:", error);
    return res.status(500).json({ error: "Failed to fetch live my commits" });
  }
}

export async function updateProjectGithubSyncSettingsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  const { autoSyncEnabled, syncIntervalMinutes } = req.body ?? {};
  if (typeof autoSyncEnabled !== "boolean") {
    return res.status(400).json({ error: "autoSyncEnabled must be a boolean" });
  }
  if (typeof syncIntervalMinutes !== "number" || Number.isNaN(syncIntervalMinutes)) {
    return res.status(400).json({ error: "syncIntervalMinutes must be a number" });
  }

  try {
    const syncSettings = await updateProjectGithubSyncSettings(userId, linkId, {
      autoSyncEnabled,
      syncIntervalMinutes,
    });
    return res.json(toJsonSafe({ syncSettings }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error updating project GitHub sync settings:", error);
    return res.status(500).json({ error: "Failed to update project GitHub sync settings" });
  }
}
