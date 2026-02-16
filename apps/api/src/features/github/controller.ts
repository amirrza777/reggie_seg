import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  buildGithubOAuthConnectUrl,
  connectGithubAccount,
  GithubServiceError,
  linkGithubRepositoryToProject,
  listGithubRepositoriesForUser,
} from "./service.js";

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
    return res.status(201).json(linked);
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error linking GitHub repository to project:", error);
    return res.status(500).json({ error: "Failed to link GitHub repository to project" });
  }
}
