import type { Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import {
  analyseProjectGithubRepository,
  linkGithubRepositoryToProject,
  removeProjectGithubRepositoryLink,
  listProjectGithubRepositories,
  GithubServiceError,
} from "../service.js";
import { toJsonSafe } from "./controller.utils.js";
import { parseGithubRepoLinkBody, parseLinkIdParam, parseProjectIdQuery } from "./controller.parsers.js";

/** Handles requests for link GitHub project repo. */
export async function linkGithubProjectRepoHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseGithubRepoLinkBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const linked = await linkGithubRepositoryToProject(userId, parsedBody.value);
    return res.status(201).json(toJsonSafe(linked));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error linking GitHub repository to project:", error);
    return res.status(500).json({ error: "Failed to link GitHub repository to project" });
  }
}

/** Handles requests for remove GitHub project repo. */
export async function removeGithubProjectRepoHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });

  try {
    const removed = await removeProjectGithubRepositoryLink(userId, linkId.value);
    return res.json(toJsonSafe({ removed }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error removing GitHub repository link:", error);
    return res.status(500).json({ error: "Failed to remove GitHub repository link" });
  }
}

/** Handles requests for list project GitHub repos. */
export async function listProjectGithubReposHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const projectId = parseProjectIdQuery(req.query.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const links = await listProjectGithubRepositories(userId, projectId.value);
    return res.json(toJsonSafe({ links }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error listing project GitHub repositories:", error);
    return res.status(500).json({ error: "Failed to list project GitHub repositories" });
  }
}

/** Handles requests for analyse project GitHub repo. */
export async function analyseProjectGithubRepoHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const linkId = parseLinkIdParam(req.params.linkId);
  if (!linkId.ok) return res.status(400).json({ error: linkId.error });

  try {
    const snapshot = await analyseProjectGithubRepository(userId, linkId.value);
    return res.status(201).json(toJsonSafe({ snapshot }));
  } catch (error) {
    if (error instanceof GithubServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error analysing project GitHub repository:", error);
    return res.status(500).json({ error: "Failed to analyse project GitHub repository" });
  }
}
