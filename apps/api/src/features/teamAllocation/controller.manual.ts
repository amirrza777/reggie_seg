import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  applyManualAllocationForProject,
  getManualAllocationWorkspaceForProject,
} from "./service.js";
import { parseManualAllocationSearchQuery } from "./controller.shared.js";

export async function getManualAllocationWorkspaceHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const searchQuery = parseManualAllocationSearchQuery(req.query?.q);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (searchQuery === "invalid") {
    return res.status(400).json({ error: "q must be a string with up to 120 characters" });
  }

  try {
    const workspace =
      searchQuery !== null
        ? await getManualAllocationWorkspaceForProject(staffId, projectId, searchQuery)
        : await getManualAllocationWorkspaceForProject(staffId, projectId);
    return res.json(workspace);
  } catch (error: any) {
    if (error?.code === "INVALID_SEARCH_QUERY") {
      return res.status(400).json({ error: "q must be a string with up to 120 characters" });
    }
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

export async function applyManualAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamName = typeof req.body?.teamName === "string" ? req.body.teamName : "";
  const rawStudentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : null;
  const studentIds = rawStudentIds ? rawStudentIds.map((studentId: unknown) => Number(studentId)) : null;

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (
    rawStudentIds === null ||
    studentIds === null ||
    studentIds.some((studentId: number) => Number.isNaN(studentId))
  ) {
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