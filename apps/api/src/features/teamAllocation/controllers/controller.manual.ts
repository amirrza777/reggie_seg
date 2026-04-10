import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { sendProjectOrModuleArchivedConflict } from "../../shared/projectWriteGuard.js";
import {
  applyManualAllocationForProject,
  getManualAllocationWorkspaceForProject,
} from "../service/service.js";
import {
  parseManualAllocationBody,
  parseManualAllocationWorkspaceQuery,
  parseProjectIdParam,
  parseStaffActor,
} from "./controller.parsers.js";

export async function getManualAllocationWorkspaceHandler(req: AuthRequest, res: Response) {
  const staffId = parseStaffActor(req);
  if (!staffId.ok) return res.status(401).json({ error: staffId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });
  const searchQuery = parseManualAllocationWorkspaceQuery(req.query);
  if (!searchQuery.ok) return res.status(400).json({ error: searchQuery.error });

  try {
    const workspace =
      searchQuery.value !== null
        ? await getManualAllocationWorkspaceForProject(staffId.value, projectId.value, searchQuery.value)
        : await getManualAllocationWorkspaceForProject(staffId.value, projectId.value);
    return res.json(workspace);
  } catch (error: any) {
    if (error?.code === "INVALID_SEARCH_QUERY") {
      return res.status(400).json({ error: "q must be a string with up to 120 characters" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error loading manual allocation workspace:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function applyManualAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = parseStaffActor(req);
  if (!staffId.ok) return res.status(401).json({ error: staffId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });
  const parsedBody = parseManualAllocationBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await applyManualAllocationForProject(staffId.value, projectId.value, parsedBody.value);
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
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error applying manual team allocation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}