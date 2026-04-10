import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { sendProjectOrModuleArchivedConflict } from "../../shared/projectWriteGuard.js";
import {
  applyRandomAllocationForProject,
  previewRandomAllocationForProject,
} from "../service/service.js";
import {
  parseProjectIdParam,
  parseRandomAllocationApplyBody,
  parseRandomAllocationPreviewQuery,
  parseStaffActor,
} from "./controller.parsers.js";

export async function previewRandomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = parseStaffActor(req);
  if (!staffId.ok) return res.status(401).json({ error: staffId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });
  const parsedQuery = parseRandomAllocationPreviewQuery(req.query);
  if (!parsedQuery.ok) return res.status(400).json({ error: parsedQuery.error });
  try {
    const { teamCount, ...randomOptions } = parsedQuery.value;
    const preview =
      Object.keys(randomOptions).length > 0
        ? await previewRandomAllocationForProject(staffId.value, projectId.value, teamCount, randomOptions)
        : await previewRandomAllocationForProject(staffId.value, projectId.value, teamCount);
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
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    if (error?.code === "NO_VACANT_STUDENTS") {
      return res.status(409).json({ error: "No vacant students are available for this project" });
    }
    console.error("Error previewing random team allocation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function applyRandomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = parseStaffActor(req);
  if (!staffId.ok) return res.status(401).json({ error: staffId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });
  const parsedBody = parseRandomAllocationApplyBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const { teamCount, ...options } = parsedBody.value;
    const result = await applyRandomAllocationForProject(staffId.value, projectId.value, teamCount, options);
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
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
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