import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  createTeamWarningForStaff,
  evaluateProjectWarningsForStaff,
  fetchMyTeamWarnings,
  fetchProjectNavFlagsConfigForStaff,
  fetchProjectWarningsConfigForStaff,
  fetchTeamWarningsForStaff,
  resolveTeamWarningForStaff,
  updateProjectNavFlagsConfigForStaff,
  updateProjectWarningsConfigForStaff,
} from "./service.js";
import { parsePositiveInt, resolveAuthenticatedUserId } from "./controller.shared.js";

function parseSeverity(value: unknown): "LOW" | "MEDIUM" | "HIGH" | null {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH") {
    return value;
  }
  return null;
}

function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

export async function createStaffTeamWarningHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);
  const teamId = parsePositiveInt(req.params.teamId);
  const type = parseNonEmptyString(req.body?.type);
  const severity = parseSeverity(req.body?.severity);
  const title = parseNonEmptyString(req.body?.title);
  const details = parseNonEmptyString(req.body?.details);

  if (actorUserId === null) {
    return;
  }
  if (!projectId || !teamId) {
    return res.status(400).json({ error: "Invalid project ID or team ID" });
  }
  if (!type || !severity || !title || !details) {
    return res.status(400).json({ error: "type, severity, title, and details are required" });
  }

  try {
    const warning = await createTeamWarningForStaff(actorUserId, projectId, teamId, {
      type,
      severity,
      title,
      details,
    });
    if (!warning) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.status(201).json({ warning });
  } catch (error: any) {
    if (error?.code === "WARNINGS_DISABLED") {
      return res.status(409).json({ error: error.message ?? "Warnings are disabled for this project" });
    }
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message ?? "Forbidden" });
    }
    console.error("Error creating staff team warning:", error);
    return res.status(500).json({ error: "Failed to create team warning" });
  }
}

export async function getStaffTeamWarningsHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);
  const teamId = parsePositiveInt(req.params.teamId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId || !teamId) {
    return res.status(400).json({ error: "Invalid project ID or team ID" });
  }

  try {
    const warnings = await fetchTeamWarningsForStaff(actorUserId, projectId, teamId);
    if (!warnings) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.json({ warnings });
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message ?? "Forbidden" });
    }
    console.error("Error fetching staff team warnings:", error);
    return res.status(500).json({ error: "Failed to fetch team warnings" });
  }
}

export async function resolveStaffTeamWarningHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);
  const teamId = parsePositiveInt(req.params.teamId);
  const warningId = parsePositiveInt(req.params.warningId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId || !teamId || !warningId) {
    return res.status(400).json({ error: "Invalid project ID, team ID, or warning ID" });
  }

  try {
    const warning = await resolveTeamWarningForStaff(actorUserId, projectId, teamId, warningId);
    if (!warning) {
      return res.status(404).json({ error: "Warning not found for this team and project" });
    }
    return res.json({ warning });
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message ?? "Forbidden" });
    }
    console.error("Error resolving staff team warning:", error);
    return res.status(500).json({ error: "Failed to resolve team warning" });
  }
}

export async function getMyTeamWarningsHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const warnings = await fetchMyTeamWarnings(actorUserId, projectId);
    if (!warnings) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    return res.json({ warnings });
  } catch (error: any) {
    console.error("Error fetching team warnings for user:", error);
    return res.status(500).json({ error: "Failed to fetch team warnings" });
  }
}

export async function getProjectWarningsConfigHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const config = await fetchProjectWarningsConfigForStaff(actorUserId, projectId);
    if (!config) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(config);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message ?? "Forbidden" });
    }
    console.error("Error fetching project warnings config:", error);
    return res.status(500).json({ error: "Failed to fetch project warnings config" });
  }
}

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

export async function updateProjectWarningsConfigHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);
  const warningsConfig = req.body?.warningsConfig;

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (warningsConfig === undefined) {
    return res.status(400).json({ error: "warningsConfig is required" });
  }

  try {
    const updated = await updateProjectWarningsConfigForStaff(actorUserId, projectId, warningsConfig);
    return res.json(updated);
  } catch (error: any) {
    if (error?.code === "INVALID_WARNINGS_CONFIG") {
      return res.status(400).json({ error: error.message ?? "Invalid warnings config" });
    }
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message ?? "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error updating project warnings config:", error);
    return res.status(500).json({ error: "Failed to update project warnings config" });
  }
}

export async function evaluateProjectWarningsHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const summary = await evaluateProjectWarningsForStaff(actorUserId, projectId);
    if (!summary) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(summary);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message ?? "Forbidden" });
    }
    console.error("Error evaluating project warnings:", error);
    return res.status(500).json({ error: "Failed to evaluate project warnings" });
  }
}
