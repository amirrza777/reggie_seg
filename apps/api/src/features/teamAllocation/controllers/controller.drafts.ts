import type { Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import { sendProjectOrModuleArchivedConflict } from "../../../shared/projectWriteGuard.js";
import {
  approveAllocationDraftForProject,
  deleteAllocationDraftForProject,
  listAllocationDraftsForProject,
  updateAllocationDraftForProject,
} from "../service/service.js";
import {
  parseDraftExpectedUpdatedAtBody,
  parseDraftTeamIdParam,
  parseProjectIdParam,
  parseStaffActor,
  parseUpdateDraftBody,
} from "./controller.parsers.js";

export async function listAllocationDraftsHandler(req: AuthRequest, res: Response) {
  const staffId = parseStaffActor(req);
  if (!staffId.ok) return res.status(401).json({ error: staffId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const drafts = await listAllocationDraftsForProject(staffId.value, projectId.value);
    return res.json(drafts);
  } catch (error: any) {
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    if (error?.code === "P2021" || error?.code === "P2022") {
      return res.status(503).json({
        error: "Allocation drafts are unavailable until the latest database migration is applied",
      });
    }
    console.error("Error loading allocation drafts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateAllocationDraftHandler(req: AuthRequest, res: Response) {
  const staffId = parseStaffActor(req);
  if (!staffId.ok) return res.status(401).json({ error: staffId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });
  const teamId = parseDraftTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });
  const parsedBody = parseUpdateDraftBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await updateAllocationDraftForProject(staffId.value, projectId.value, teamId.value, parsedBody.value);
    return res.json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_DRAFT_TEAM_ID") {
      return res.status(400).json({ error: "Invalid draft team ID" });
    }
    if (error?.code === "INVALID_DRAFT_UPDATE") {
      return res.status(400).json({ error: "Provide teamName and/or studentIds to update draft" });
    }
    if (error?.code === "INVALID_TEAM_NAME") {
      return res.status(400).json({ error: "teamName must be a non-empty string when provided" });
    }
    if (error?.code === "INVALID_STUDENT_IDS") {
      return res.status(400).json({ error: "studentIds must contain unique positive integers" });
    }
    if (error?.code === "INVALID_EXPECTED_UPDATED_AT") {
      return res.status(400).json({ error: "expectedUpdatedAt must be an ISO datetime string when provided" });
    }
    if (error?.code === "STUDENT_NOT_IN_MODULE") {
      return res.status(400).json({ error: "All selected students must belong to this module" });
    }
    if (error?.code === "TEAM_NAME_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Team name already exists in this enterprise" });
    }
    if (error?.code === "STUDENT_ALREADY_ASSIGNED") {
      return res.status(409).json({
        error: "One or more selected students are already assigned in an active team for this project",
      });
    }
    if (error?.code === "STUDENT_IN_OTHER_DRAFT") {
      return res.status(409).json({
        error: "One or more selected students already belong to another draft team",
      });
    }
    if (error?.code === "DRAFT_TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Draft team not found" });
    }
    if (error?.code === "DRAFT_OUTDATED") {
      return res.status(409).json({
        error: "Draft team was updated by another staff member. Refresh drafts and try again.",
      });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    if (error?.code === "P2021" || error?.code === "P2022") {
      return res.status(503).json({
        error: "Allocation drafts are unavailable until the latest database migration is applied",
      });
    }
    console.error("Error updating allocation draft:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function approveAllocationDraftHandler(req: AuthRequest, res: Response) {
  const staffId = parseStaffActor(req);
  if (!staffId.ok) return res.status(401).json({ error: staffId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });
  const teamId = parseDraftTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });
  const parsedBody = parseDraftExpectedUpdatedAtBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await approveAllocationDraftForProject(staffId.value, projectId.value, teamId.value, parsedBody.value);
    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_DRAFT_TEAM_ID") {
      return res.status(400).json({ error: "Invalid draft team ID" });
    }
    if (error?.code === "APPROVAL_FORBIDDEN") {
      return res.status(403).json({ error: "Only module owners can approve allocation drafts" });
    }
    if (error?.code === "DRAFT_TEAM_HAS_NO_MEMBERS") {
      return res.status(409).json({ error: "Draft team has no members and cannot be approved" });
    }
    if (error?.code === "INVALID_EXPECTED_UPDATED_AT") {
      return res.status(400).json({ error: "expectedUpdatedAt must be an ISO datetime string when provided" });
    }
    if (error?.code === "STUDENTS_NO_LONGER_AVAILABLE") {
      return res.status(409).json({
        error: "Some selected students are already assigned in active teams. Refresh drafts and try again.",
      });
    }
    if (error?.code === "DRAFT_OUTDATED") {
      return res.status(409).json({
        error: "Draft team was updated by another staff member. Refresh drafts and try again.",
      });
    }
    if (error?.code === "DRAFT_TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Draft team not found" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    if (error?.code === "P2021" || error?.code === "P2022") {
      return res.status(503).json({
        error: "Allocation drafts are unavailable until the latest database migration is applied",
      });
    }
    console.error("Error approving allocation draft:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteAllocationDraftHandler(req: AuthRequest, res: Response) {
  const staffId = parseStaffActor(req);
  if (!staffId.ok) return res.status(401).json({ error: staffId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });
  const teamId = parseDraftTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });
  const parsedBody = parseDraftExpectedUpdatedAtBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await deleteAllocationDraftForProject(staffId.value, projectId.value, teamId.value, parsedBody.value);
    return res.json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_DRAFT_TEAM_ID") {
      return res.status(400).json({ error: "Invalid draft team ID" });
    }
    if (error?.code === "INVALID_EXPECTED_UPDATED_AT") {
      return res.status(400).json({ error: "expectedUpdatedAt must be an ISO datetime string when provided" });
    }
    if (error?.code === "DELETE_DRAFT_FORBIDDEN") {
      return res.status(403).json({
        error: "You can only delete drafts you created unless you are a module owner",
      });
    }
    if (error?.code === "DRAFT_OUTDATED") {
      return res.status(409).json({
        error: "Draft team was updated by another staff member. Refresh drafts and try again.",
      });
    }
    if (error?.code === "DRAFT_TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Draft team not found" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    if (error?.code === "P2021" || error?.code === "P2022") {
      return res.status(503).json({
        error: "Allocation drafts are unavailable until the latest database migration is applied",
      });
    }
    console.error("Error deleting allocation draft:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}