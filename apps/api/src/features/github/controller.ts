import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  analyseProjectGithubRepository,
  buildGithubConnectUrl,
  connectGithubAccount,
  disconnectGithubAccount,
  getGithubConnectionStatus,
  getLatestProjectGithubRepositorySnapshot,
  getProjectGithubMappingCoverage,
  getProjectGithubRepositorySnapshot,
  GithubServiceError,
  linkGithubRepositoryToProject,
  removeProjectGithubRepositoryLink,
  listProjectGithubRepositorySnapshots,
  listProjectGithubRepositories,
  listGithubRepositoriesForUser,
  updateProjectGithubSyncSettings,
} from "./service.js";

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) =>
      typeof currentValue === "bigint" ? Number(currentValue) : currentValue
    )
  ) as T;
}

function withQuery(path: string, params: Record<string, string>) {
  try {
    const absolute = new URL(path);
    for (const [key, value] of Object.entries(params)) {
      absolute.searchParams.set(key, value);
    }
    return absolute.toString();
  } catch {
    const [basePath, existingQuery = ""] = path.split("?", 2);
    const query = new URLSearchParams(existingQuery);
    for (const [key, value] of Object.entries(params)) {
      query.set(key, value);
    }
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }
}

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

export async function linkGithubProjectRepoHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const {
    projectId,
    githubRepoId,
    name,
    fullName,
    htmlUrl,
    isPrivate,
    ownerLogin,
    defaultBranch,
  } = req.body ?? {};

  if (typeof projectId !== "number" || Number.isNaN(projectId)) {
    return res.status(400).json({ error: "projectId must be a number" });
  }
  if (typeof githubRepoId !== "number" || Number.isNaN(githubRepoId)) {
    return res.status(400).json({ error: "githubRepoId must be a number" });
  }
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required and must be a string" });
  }
  if (!fullName || typeof fullName !== "string") {
    return res.status(400).json({ error: "fullName is required and must be a string" });
  }
  if (!htmlUrl || typeof htmlUrl !== "string") {
    return res.status(400).json({ error: "htmlUrl is required and must be a string" });
  }
  if (typeof isPrivate !== "boolean") {
    return res.status(400).json({ error: "isPrivate must be a boolean" });
  }
  if (!ownerLogin || typeof ownerLogin !== "string") {
    return res.status(400).json({ error: "ownerLogin is required and must be a string" });
  }
  if (!(defaultBranch === null || typeof defaultBranch === "string")) {
    return res.status(400).json({ error: "defaultBranch must be a string or null" });
  }

  try {
    const linked = await linkGithubRepositoryToProject(userId, {
      projectId,
      githubRepoId,
      name,
      fullName,
      htmlUrl,
      isPrivate,
      ownerLogin,
      defaultBranch,
    });
    return res.status(201).json(toJsonSafe(linked));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error linking GitHub repository to project:", error);
    return res.status(500).json({ error: "Failed to link GitHub repository to project" });
  }
}

export async function removeGithubProjectRepoHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  try {
    const removed = await removeProjectGithubRepositoryLink(userId, linkId);
    return res.json(toJsonSafe({ removed }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error removing GitHub repository link:", error);
    return res.status(500).json({ error: "Failed to remove GitHub repository link" });
  }
}

export async function listProjectGithubReposHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const projectId = Number(req.query.projectId);
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "projectId query param must be a number" });
  }

  try {
    const links = await listProjectGithubRepositories(userId, projectId);
    return res.json(toJsonSafe({ links }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error listing project GitHub repositories:", error);
    return res.status(500).json({ error: "Failed to list project GitHub repositories" });
  }
}

export async function analyseProjectGithubRepoHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = Number(req.params.linkId);
  if (Number.isNaN(linkId)) {
    return res.status(400).json({ error: "linkId must be a number" });
  }

  try {
    const snapshot = await analyseProjectGithubRepository(userId, linkId);
    return res.status(201).json(toJsonSafe({ snapshot }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error analysing project GitHub repository:", error);
    return res.status(500).json({ error: "Failed to analyse project GitHub repository" });
  }
}

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
