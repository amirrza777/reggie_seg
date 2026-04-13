import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  listLiveProjectGithubRepositoryBranchCommits,
  listLiveProjectGithubRepositoryBranches,
  listLiveProjectGithubRepositoryMyCommits,
  updateProjectGithubSyncSettings,
  GithubServiceError,
} from "./service.js";
import { toJsonSafe } from "./controller.utils.js";
import {
  parseBranchCommitsQuery,
  parseLinkIdParam,
  parseMyCommitsQuery,
  parseSyncSettingsBody,
} from "./controller.parsers.js";

/** Handles requests for list live project GitHub repo branches. */
export async function listLiveProjectGithubRepoBranchesHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });
  const parsedSearchQuery = parseSearchQuery(req.query?.q);
  if (!parsedSearchQuery.ok) {
    return res.status(400).json({ error: parsedSearchQuery.error });
  }

  try {
    const branchData = parsedSearchQuery.value
      ? await listLiveProjectGithubRepositoryBranches(userId, linkId.value, { query: parsedSearchQuery.value })
      : await listLiveProjectGithubRepositoryBranches(userId, linkId.value);
    return res.json(toJsonSafe(branchData));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching live project GitHub branches:", error);
    return res.status(500).json({ error: "Failed to fetch live project GitHub branches" });
  }
}

/** Handles requests for list live project GitHub repo branch commits. */
export async function listLiveProjectGithubRepoBranchCommitsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });
  const parsedQuery = parseBranchCommitsQuery(req.query);
  if (!parsedQuery.ok) return res.status(400).json({ error: parsedQuery.error });

  try {
    const commitData = await listLiveProjectGithubRepositoryBranchCommits(userId, linkId.value, parsedQuery.value.branch, parsedQuery.value.limit);
    return res.json(toJsonSafe(commitData));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching live branch commits:", error);
    return res.status(500).json({ error: "Failed to fetch live branch commits" });
  }
}

/** Handles requests for list live project GitHub repo my commits. */
export async function listLiveProjectGithubRepoMyCommitsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });
  const parsedQuery = parseMyCommitsQuery(req.query);
  if (!parsedQuery.ok) return res.status(400).json({ error: parsedQuery.error });

  try {
    const commitData = await listLiveProjectGithubRepositoryMyCommits(
      userId,
      linkId.value,
      parsedQuery.value.page,
      parsedQuery.value.perPage,
      { includeTotals: parsedQuery.value.includeTotals },
    );
    return res.json(toJsonSafe(commitData));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching live my commits:", error);
    return res.status(500).json({ error: "Failed to fetch live my commits" });
  }
}

/** Handles requests for update project GitHub sync settings. */
export async function updateProjectGithubSyncSettingsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });
  const parsedBody = parseSyncSettingsBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const syncSettings = await updateProjectGithubSyncSettings(userId, linkId.value, parsedBody.value);
    return res.json(toJsonSafe({ syncSettings }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error updating project GitHub sync settings:", error);
    return res.status(500).json({ error: "Failed to update project GitHub sync settings" });
  }
}
