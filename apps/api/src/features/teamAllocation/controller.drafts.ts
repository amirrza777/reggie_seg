import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  approveAllocationDraftForProject,
  deleteAllocationDraftForProject,
  listAllocationDraftsForProject,
  updateAllocationDraftForProject,
} from "./service.js";

export async function listAllocationDraftsHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const drafts = await listAllocationDraftsForProject(staffId, projectId);
    return res.json(drafts);
  } catch (error: any) {
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
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
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const hasTeamName = Object.prototype.hasOwnProperty.call(body, "teamName");
  const hasStudentIds = Object.prototype.hasOwnProperty.call(body, "studentIds");
  const hasExpectedUpdatedAt = Object.prototype.hasOwnProperty.call(body, "expectedUpdatedAt");
  const rawTeamName = (body as Record<string, unknown>).teamName;
  const rawStudentIds = (body as Record<string, unknown>).studentIds;
  const rawExpectedUpdatedAt = (body as Record<string, unknown>).expectedUpdatedAt;

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid draft team ID" });
  }
  if (!hasTeamName && !hasStudentIds) {
    return res.status(400).json({ error: "Provide teamName and/or studentIds to update draft" });
  }
  if (hasTeamName && typeof rawTeamName !== "string") {
    return res.status(400).json({ error: "teamName must be a non-empty string when provided" });
  }
  if (hasStudentIds && !Array.isArray(rawStudentIds)) {
    return res.status(400).json({ error: "studentIds must be an array of numbers when provided" });
  }
  if (hasExpectedUpdatedAt && typeof rawExpectedUpdatedAt !== "string") {
    return res.status(400).json({ error: "expectedUpdatedAt must be an ISO datetime string when provided" });
  }

  const studentIds =
    hasStudentIds && Array.isArray(rawStudentIds) ? rawStudentIds.map((studentId) => Number(studentId)) : undefined;
  if (
    hasStudentIds &&
    (studentIds === undefined || studentIds.some((studentId) => Number.isNaN(studentId)))
  ) {
    return res.status(400).json({ error: "studentIds must be an array of numbers when provided" });
  }

  try {
    const result = await updateAllocationDraftForProject(staffId, projectId, teamId, {
      ...(hasTeamName && typeof rawTeamName === "string" ? { teamName: rawTeamName } : {}),
      ...(hasStudentIds && studentIds !== undefined ? { studentIds } : {}),
      ...(hasExpectedUpdatedAt && typeof rawExpectedUpdatedAt === "string"
        ? { expectedUpdatedAt: rawExpectedUpdatedAt }
        : {}),
    });
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
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
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
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const hasExpectedUpdatedAt = Object.prototype.hasOwnProperty.call(body, "expectedUpdatedAt");
  const rawExpectedUpdatedAt = (body as Record<string, unknown>).expectedUpdatedAt;

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid draft team ID" });
  }
  if (hasExpectedUpdatedAt && typeof rawExpectedUpdatedAt !== "string") {
    return res.status(400).json({ error: "expectedUpdatedAt must be an ISO datetime string when provided" });
  }

  try {
    const result = await approveAllocationDraftForProject(staffId, projectId, teamId, {
      ...(hasExpectedUpdatedAt && typeof rawExpectedUpdatedAt === "string"
        ? { expectedUpdatedAt: rawExpectedUpdatedAt }
        : {}),
    });
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
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
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
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const hasExpectedUpdatedAt = Object.prototype.hasOwnProperty.call(body, "expectedUpdatedAt");
  const rawExpectedUpdatedAt = (body as Record<string, unknown>).expectedUpdatedAt;

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid draft team ID" });
  }
  if (hasExpectedUpdatedAt && typeof rawExpectedUpdatedAt !== "string") {
    return res.status(400).json({ error: "expectedUpdatedAt must be an ISO datetime string when provided" });
  }

  try {
    const result = await deleteAllocationDraftForProject(staffId, projectId, teamId, {
      ...(hasExpectedUpdatedAt && typeof rawExpectedUpdatedAt === "string"
        ? { expectedUpdatedAt: rawExpectedUpdatedAt }
        : {}),
    });
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
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
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