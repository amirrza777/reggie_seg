import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  applyRandomAllocationForProject,
  previewRandomAllocationForProject,
} from "./service.js";
import { parseOptionalPositiveInteger } from "./controller.shared.js";

export async function previewRandomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamCount = Number(req.query.teamCount);
  const minTeamSize = parseOptionalPositiveInteger(req.query.minTeamSize);
  const maxTeamSize = parseOptionalPositiveInteger(req.query.maxTeamSize);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    return res.status(400).json({ error: "teamCount must be a positive integer" });
  }
  if (minTeamSize === "invalid") {
    return res.status(400).json({ error: "minTeamSize must be a positive integer when provided" });
  }
  if (maxTeamSize === "invalid") {
    return res.status(400).json({ error: "maxTeamSize must be a positive integer when provided" });
  }
  if (
    minTeamSize !== null &&
    maxTeamSize !== null &&
    minTeamSize > maxTeamSize
  ) {
    return res.status(400).json({ error: "minTeamSize cannot be greater than maxTeamSize" });
  }
  try {
    const randomOptions = {
      ...(minTeamSize !== null ? { minTeamSize } : {}),
      ...(maxTeamSize !== null ? { maxTeamSize } : {}),
    };
    const preview =
      Object.keys(randomOptions).length > 0
        ? await previewRandomAllocationForProject(staffId, projectId, teamCount, randomOptions)
        : await previewRandomAllocationForProject(staffId, projectId, teamCount);
    return res.json(preview);
  } catch (error: any) {
    if (error?.code === "INVALID_TEAM_COUNT") {
      return res.status(400).json({ error: "teamCount must be a positive integer" });
    }
    if (error?.code === "INVALID_MIN_TEAM_SIZE") {
      return res.status(400).json({ error: "minTeamSize must be a positive integer when provided" });
    }
    if (error?.code === "INVALID_MAX_TEAM_SIZE") {
      return res.status(400).json({ error: "maxTeamSize must be a positive integer when provided" });
    }
    if (error?.code === "INVALID_TEAM_SIZE_RANGE") {
      return res.status(400).json({ error: "minTeamSize cannot be greater than maxTeamSize" });
    }
    if (error?.code === "TEAM_SIZE_CONSTRAINTS_UNSATISFIABLE") {
      return res.status(400).json({
        error: "Current team size constraints cannot be satisfied for the available students",
      });
    }
    if (error?.code === "TEAM_COUNT_EXCEEDS_STUDENT_COUNT") {
      return res.status(400).json({ error: "teamCount cannot be greater than available students" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
    }
    if (error?.code === "NO_VACANT_STUDENTS") {
      return res.status(409).json({ error: "No vacant students are available for this project" });
    }
    console.error("Error previewing random team allocation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function applyRandomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamCount = Number(req.body?.teamCount);
  const minTeamSize = parseOptionalPositiveInteger(req.body?.minTeamSize);
  const maxTeamSize = parseOptionalPositiveInteger(req.body?.maxTeamSize);
  const rawTeamNames = req.body?.teamNames;
  const hasInvalidTeamNamesPayload =
    rawTeamNames !== undefined &&
    (!Array.isArray(rawTeamNames) || rawTeamNames.some((teamName) => typeof teamName !== "string"));
  const teamNames =
    !hasInvalidTeamNamesPayload && Array.isArray(rawTeamNames)
      ? rawTeamNames.map((teamName) => teamName.trim())
      : undefined;

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    return res.status(400).json({ error: "teamCount must be a positive integer" });
  }
  if (minTeamSize === "invalid") {
    return res.status(400).json({ error: "minTeamSize must be a positive integer when provided" });
  }
  if (maxTeamSize === "invalid") {
    return res.status(400).json({ error: "maxTeamSize must be a positive integer when provided" });
  }
  if (
    minTeamSize !== null &&
    maxTeamSize !== null &&
    minTeamSize > maxTeamSize
  ) {
    return res.status(400).json({ error: "minTeamSize cannot be greater than maxTeamSize" });
  }
  if (hasInvalidTeamNamesPayload) {
    return res.status(400).json({ error: "teamNames must be an array of strings when provided" });
  }

  try {
    const result = await applyRandomAllocationForProject(staffId, projectId, teamCount, {
      ...(teamNames !== undefined ? { teamNames } : {}),
      ...(minTeamSize !== null ? { minTeamSize } : {}),
      ...(maxTeamSize !== null ? { maxTeamSize } : {}),
    });
    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_TEAM_COUNT") {
      return res.status(400).json({ error: "teamCount must be a positive integer" });
    }
    if (error?.code === "INVALID_MIN_TEAM_SIZE") {
      return res.status(400).json({ error: "minTeamSize must be a positive integer when provided" });
    }
    if (error?.code === "INVALID_MAX_TEAM_SIZE") {
      return res.status(400).json({ error: "maxTeamSize must be a positive integer when provided" });
    }
    if (error?.code === "INVALID_TEAM_SIZE_RANGE") {
      return res.status(400).json({ error: "minTeamSize cannot be greater than maxTeamSize" });
    }
    if (error?.code === "TEAM_SIZE_CONSTRAINTS_UNSATISFIABLE") {
      return res.status(400).json({
        error: "Current team size constraints cannot be satisfied for the available students",
      });
    }
    if (error?.code === "INVALID_TEAM_NAMES") {
      return res.status(400).json({ error: "teamNames must contain one non-empty name per generated team" });
    }
    if (error?.code === "DUPLICATE_TEAM_NAMES") {
      return res.status(400).json({ error: "teamNames must be unique" });
    }
    if (error?.code === "TEAM_COUNT_EXCEEDS_STUDENT_COUNT") {
      return res.status(400).json({ error: "teamCount cannot be greater than available students" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
    }
    if (error?.code === "NO_VACANT_STUDENTS") {
      return res.status(409).json({ error: "No vacant students are available for this project" });
    }
    if (error?.code === "STUDENTS_NO_LONGER_VACANT") {
      return res.status(409).json({ error: "Some students are no longer vacant. Regenerate preview and try again." });
    }
    if (error?.code === "TEAM_NAME_ALREADY_EXISTS") {
      return res.status(409).json({ error: "One or more team names already exist in this enterprise" });
    }
    console.error("Error applying random team allocation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}