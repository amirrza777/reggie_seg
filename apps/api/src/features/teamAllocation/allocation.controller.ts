import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  applyManualAllocationForProject,
  applyRandomAllocationForProject,
  getManualAllocationWorkspaceForProject,
  previewRandomAllocationForProject,
} from "./service.js";

/** Handles requests for preview random allocation. */
export async function previewRandomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamCount = Number(req.query.teamCount);
  const seedQuery = req.query.seed;
  const seed = typeof seedQuery === "string" ? Number(seedQuery) : undefined;

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    return res.status(400).json({ error: "teamCount must be a positive integer" });
  }
  if (seed !== undefined && Number.isNaN(seed)) {
    return res.status(400).json({ error: "seed must be a number when provided" });
  }

  try {
    const preview = await previewRandomAllocationForProject(staffId, projectId, teamCount, { seed });
    return res.json(preview);
  } catch (error: any) {
    if (error?.code === "INVALID_TEAM_COUNT") {
      return res.status(400).json({ error: "teamCount must be a positive integer" });
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

/** Handles requests for get manual allocation workspace. */
export async function getManualAllocationWorkspaceHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const parsedSearchQuery = parseSearchQuery(req.query?.q);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (!parsedSearchQuery.ok) {
    return res.status(400).json({ error: parsedSearchQuery.error });
  }

  try {
    const workspace = parsedSearchQuery.value
      ? await getManualAllocationWorkspaceForProject(staffId, projectId, { query: parsedSearchQuery.value })
      : await getManualAllocationWorkspaceForProject(staffId, projectId);
    return res.json(workspace);
  } catch (error: any) {
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
    }
    console.error("Error loading manual allocation workspace:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for apply random allocation. */
export async function applyRandomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamCount = Number(req.body?.teamCount);
  const rawSeed = req.body?.seed;
  const seed = rawSeed === undefined || rawSeed === null || rawSeed === "" ? undefined : Number(rawSeed);
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
  if (seed !== undefined && Number.isNaN(seed)) {
    return res.status(400).json({ error: "seed must be a number when provided" });
  }
  if (hasInvalidTeamNamesPayload) {
    return res.status(400).json({ error: "teamNames must be an array of strings when provided" });
  }

  try {
    const result = await applyRandomAllocationForProject(staffId, projectId, teamCount, {
      seed,
      ...(teamNames !== undefined ? { teamNames } : {}),
    });
    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_TEAM_COUNT") {
      return res.status(400).json({ error: "teamCount must be a positive integer" });
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

/** Handles requests for apply manual allocation. */
export async function applyManualAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamName = typeof req.body?.teamName === "string" ? req.body.teamName : "";
  const rawStudentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : null;
  const studentIds = rawStudentIds ? rawStudentIds.map((studentId) => Number(studentId)) : null;

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (rawStudentIds === null || studentIds === null || studentIds.some((studentId) => Number.isNaN(studentId))) {
    return res.status(400).json({ error: "studentIds must be an array of numbers" });
  }

  try {
    const result = await applyManualAllocationForProject(staffId, projectId, {
      teamName,
      studentIds,
    });
    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_TEAM_NAME") {
      return res.status(400).json({ error: "teamName is required" });
    }
    if (error?.code === "INVALID_STUDENT_IDS") {
      return res.status(400).json({ error: "studentIds must contain unique positive integers" });
    }
    if (error?.code === "STUDENT_NOT_IN_MODULE") {
      return res.status(400).json({ error: "All selected students must belong to this module" });
    }
    if (error?.code === "STUDENT_ALREADY_ASSIGNED") {
      return res.status(409).json({ error: "One or more selected students are already in a team for this project" });
    }
    if (error?.code === "TEAM_NAME_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Team name already exists in this enterprise" });
    }
    if (error?.code === "STUDENTS_NO_LONGER_AVAILABLE") {
      return res.status(409).json({ error: "Some selected students are no longer available. Refresh and try again." });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
    }
    console.error("Error applying manual team allocation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
