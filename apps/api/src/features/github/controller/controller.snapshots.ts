import type { Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import {
  getLatestProjectGithubRepositorySnapshot,
  getProjectGithubMappingCoverage,
  getProjectGithubRepositorySnapshot,
  listProjectGithubRepositorySnapshots,
  GithubServiceError,
} from "../service.js";
import { toJsonSafe } from "./controller.utils.js";
import { parseLinkIdParam, parseSnapshotIdParam } from "./controller.parsers.js";

/** Handles requests for list project GitHub repo snapshots. */
export async function listProjectGithubRepoSnapshotsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });

  try {
    const snapshots = await listProjectGithubRepositorySnapshots(userId, linkId.value);
    return res.json(toJsonSafe({ snapshots }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error listing project GitHub repository snapshots:", error);
    return res.status(500).json({ error: "Failed to list project GitHub repository snapshots" });
  }
}

/** Handles requests for get GitHub snapshot. */
export async function getGithubSnapshotHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const snapshotId = parseSnapshotIdParam(req.params.snapshotId);
  if (!snapshotId.ok) return res.status(400).json({ error: snapshotId.error });

  try {
    const snapshot = await getProjectGithubRepositorySnapshot(userId, snapshotId.value);
    return res.json(toJsonSafe({ snapshot }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching GitHub snapshot:", error);
    return res.status(500).json({ error: "Failed to fetch GitHub snapshot" });
  }
}

/** Handles requests for get latest project GitHub repo snapshot. */
export async function getLatestProjectGithubRepoSnapshotHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });

  try {
    const snapshot = await getLatestProjectGithubRepositorySnapshot(userId, linkId.value);
    return res.json(toJsonSafe({ snapshot }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching latest GitHub snapshot:", error);
    return res.status(500).json({ error: "Failed to fetch latest GitHub snapshot" });
  }
}

/** Handles requests for get project GitHub mapping coverage. */
export async function getProjectGithubMappingCoverageHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });

  try {
    const mappingCoverage = await getProjectGithubMappingCoverage(userId, linkId.value);
    return res.json(toJsonSafe({ mappingCoverage }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching project GitHub mapping coverage:", error);
    return res.status(500).json({ error: "Failed to fetch project GitHub mapping coverage" });
  }
}
