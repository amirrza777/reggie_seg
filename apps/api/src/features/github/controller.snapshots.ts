import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  getLatestProjectGithubRepositorySnapshot,
  getProjectGithubMappingCoverage,
  getProjectGithubRepositorySnapshot,
  listProjectGithubRepositorySnapshots,
  GithubServiceError,
} from "./service.js";
import { toJsonSafe } from "./controller.utils.js";

export async function listProjectGithubRepoSnapshotsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  try {
    const snapshots = await listProjectGithubRepositorySnapshots(userId, linkId);
    return res.json(toJsonSafe({ snapshots }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error listing project GitHub repository snapshots:", error);
    return res.status(500).json({ error: "Failed to list project GitHub repository snapshots" });
  }
}

export async function getGithubSnapshotHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const snapshotId = Number(req.params.snapshotId);
  if (Number.isNaN(snapshotId)) {
    return res.status(400).json({ error: "snapshotId must be a number" });
  }

  try {
    const snapshot = await getProjectGithubRepositorySnapshot(userId, snapshotId);
    return res.json(toJsonSafe({ snapshot }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching GitHub snapshot:", error);
    return res.status(500).json({ error: "Failed to fetch GitHub snapshot" });
  }
}

export async function getLatestProjectGithubRepoSnapshotHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  try {
    const snapshot = await getLatestProjectGithubRepositorySnapshot(userId, linkId);
    return res.json(toJsonSafe({ snapshot }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching latest GitHub snapshot:", error);
    return res.status(500).json({ error: "Failed to fetch latest GitHub snapshot" });
  }
}

export async function getProjectGithubMappingCoverageHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  try {
    const mappingCoverage = await getProjectGithubMappingCoverage(userId, linkId);
    return res.json(toJsonSafe({ mappingCoverage }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching project GitHub mapping coverage:", error);
    return res.status(500).json({ error: "Failed to fetch project GitHub mapping coverage" });
  }
}
