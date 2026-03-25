import type { Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import {
  fetchProjectNavFlagsConfigForStaff,
  updateProjectNavFlagsConfigForStaff,
} from "../service.js";
import { parsePositiveInt, resolveAuthenticatedUserId } from "../controller.shared.js";

export async function getProjectNavFlagsConfigHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const config = await fetchProjectNavFlagsConfigForStaff(actorUserId, projectId);
    if (!config) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(config);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message ?? "Forbidden" });
    }
    console.error("Error fetching project feature flags config:", error);
    return res.status(500).json({ error: "Failed to fetch project feature flags config" });
  }
}

export async function updateProjectNavFlagsConfigHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);
  const projectNavFlags = req.body?.projectNavFlags;

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (projectNavFlags === undefined) {
    return res.status(400).json({ error: "projectNavFlags is required" });
  }

  try {
    const updated = await updateProjectNavFlagsConfigForStaff(actorUserId, projectId, projectNavFlags);
    return res.json(updated);
  } catch (error: any) {
    if (error?.code === "INVALID_PROJECT_NAV_FLAGS_CONFIG") {
      return res.status(400).json({ error: error.message ?? "Invalid project feature flags config" });
    }
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message ?? "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error updating project feature flags config:", error);
    return res.status(500).json({ error: "Failed to update project feature flags config" });
  }
}
