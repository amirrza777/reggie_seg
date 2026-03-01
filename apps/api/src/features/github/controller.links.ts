import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  analyseProjectGithubRepository,
  linkGithubRepositoryToProject,
  removeProjectGithubRepositoryLink,
  listProjectGithubRepositories,
  GithubServiceError,
} from "./service.js";
import { toJsonSafe } from "./controller.utils.js";

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
