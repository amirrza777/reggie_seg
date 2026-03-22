import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  parseCustomAllocationApplyBody,
  parseCustomAllocationCoverageTemplateId,
  parseCustomAllocationPreviewBody,
  parseCustomAllocationProjectId,
  type CustomAllocationValidationCode,
} from "./customAllocation.validation.js";
import {
  createTeamInvite,
  listTeamInvites,
  listReceivedInvites,
  createTeam,
  createTeamForProject,
  getTeamById,
  addUserToTeam,
  getTeamMembers,
  acceptTeamInvite,
  declineTeamInvite,
  rejectTeamInvite,
  cancelTeamInvite,
  expireTeamInvite,
  applyManualAllocationForProject,
  applyRandomAllocationForProject,
  applyCustomAllocationForProject,
  approveAllocationDraftForProject,
  deleteAllocationDraftForProject,
  listAllocationDraftsForProject,
  getCustomAllocationCoverageForProject,
  listCustomAllocationQuestionnairesForProject,
  getManualAllocationWorkspaceForProject,
  updateAllocationDraftForProject,
  previewCustomAllocationForProject,
  previewRandomAllocationForProject,
} from "./service.js";

function respondCustomAllocationValidationError(
  res: Response,
  code: CustomAllocationValidationCode,
) {
  if (code === "INVALID_PROJECT_ID") {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (code === "INVALID_TEMPLATE_ID") {
    return res.status(400).json({ error: "questionnaireTemplateId must be a positive integer" });
  }
  if (code === "INVALID_TEAM_COUNT") {
    return res.status(400).json({ error: "teamCount must be a positive integer" });
  }
  if (code === "INVALID_MIN_TEAM_SIZE") {
    return res.status(400).json({ error: "minTeamSize must be a positive integer when provided" });
  }
  if (code === "INVALID_MAX_TEAM_SIZE") {
    return res.status(400).json({ error: "maxTeamSize must be a positive integer when provided" });
  }
  if (code === "INVALID_TEAM_SIZE_RANGE") {
    return res.status(400).json({ error: "minTeamSize cannot be greater than maxTeamSize" });
  }
  if (code === "INVALID_NON_RESPONDENT_STRATEGY") {
    return res.status(400).json({
      error: "nonRespondentStrategy must be either 'distribute_randomly' or 'exclude'",
    });
  }
  if (code === "INVALID_CRITERIA") {
    return res.status(400).json({
      error: "Each criterion must include a valid questionId, strategy, and weight between 1 and 5",
    });
  }
  if (code === "INVALID_PREVIEW_ID") {
    return res.status(400).json({ error: "previewId is required" });
  }
  return res.status(400).json({ error: "teamNames must be an array of strings when provided" });
}

function parseOptionalPositiveInteger(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return "invalid";
  }
  return parsed;
}

function parseOptionalInteger(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return "invalid";
  }
  return parsed;
}

function parseManualAllocationSearchQuery(value: unknown): string | null | "invalid" {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return "invalid";
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 120) {
    return "invalid";
  }
  return trimmed;
}

function formatCustomAllocationStaleStudentNames(staleStudents: unknown): string | null {
  if (!Array.isArray(staleStudents) || staleStudents.length === 0) {
    return null;
  }

  const names = staleStudents
    .map((student) => {
      if (!student || typeof student !== "object") {
        return "";
      }
      const row = student as Record<string, unknown>;
      const firstName = typeof row.firstName === "string" ? row.firstName.trim() : "";
      const lastName = typeof row.lastName === "string" ? row.lastName.trim() : "";
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName.length > 0) {
        return fullName;
      }
      if (typeof row.email === "string" && row.email.trim().length > 0) {
        return row.email.trim();
      }
      return "";
    })
    .filter((name) => name.length > 0);

  if (names.length === 0) {
    return null;
  }

  const visibleNames = names.slice(0, 5);
  const remainderCount = names.length - visibleNames.length;
  const suffix = remainderCount > 0 ? ` (+${remainderCount} more)` : "";
  return `${visibleNames.join(", ")}${suffix}`;
}

export async function createTeamInviteHandler(req: AuthRequest, res: Response) {
  const teamId = Number(req.body?.teamId);
  const inviterId = req.user?.sub;
  const inviteeEmail = typeof req.body?.inviteeEmail === "string" ? req.body.inviteeEmail : "";
  const inviteeId = req.body?.inviteeId ? Number(req.body.inviteeId) : undefined;
  const message = typeof req.body?.message === "string" ? req.body.message : undefined;

  if (!inviterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (isNaN(teamId) || !inviteeEmail) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const host = req.get("host");
  const baseUrl = origin ?? (host ? `${req.protocol}://${host}` : "");

  try {
    const result = await createTeamInvite({
      teamId,
      inviterId,
      inviteeEmail,
      baseUrl,
      ...(inviteeId !== undefined ? { inviteeId } : {}),
      ...(message !== undefined ? { message } : {}),
    });
    return res.json({ ok: true, inviteId: result.invite.id });
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    if (error?.code === "TEAM_ARCHIVED") {
      return res.status(409).json({ error: "This team is archived and cannot accept new invites" });
    }
    if (error?.code === "TEAM_NOT_ACTIVE") {
      return res.status(409).json({ error: "Draft teams cannot send invites until approved" });
    }
    if (error?.code === "PROJECT_COMPLETED") {
      return res.status(409).json({ error: "This project is completed. Team invites are closed." });
    }
    if (error?.code === "TEAM_ACCESS_FORBIDDEN") {
      return res.status(403).json({ error: "You are not a member of this team" });
    }
    if (error?.code === "INVITE_ALREADY_PENDING") {
      return res.status(409).json({ error: "Invite already pending" });
    }
    console.error("Error creating team invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listTeamInvitesHandler(req: AuthRequest, res: Response) {
  const requesterId = req.user?.sub;
  const teamId = Number(req.params.teamId);
  if (!requesterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const invites = await listTeamInvites(teamId, requesterId);
    return res.json(invites);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND_OR_INACTIVE") {
      return res.status(404).json({ error: "Team not found" });
    }
    if (error?.code === "TEAM_ACCESS_FORBIDDEN") {
      return res.status(403).json({ error: "You are not allowed to view invites for this team" });
    }
    console.error("Error fetching team invites:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listReceivedInvitesHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const invites = await listReceivedInvites(userId);
    return res.json(invites);
  } catch (error: any) {
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error fetching received invites:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createTeamHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  const teamData = req.body?.teamData;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!teamData) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const team = await createTeam(userId, teamData);
    return res.status(201).json(team);
  } catch (error: any) {
    if (error?.code === "TEAM_CREATION_FORBIDDEN") {
      return res.status(403).json({ error: "Only students can create teams from this workspace" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "STUDENT_ALREADY_IN_TEAM") {
      return res.status(409).json({ error: "You are already assigned to a team in this project" });
    }
    if (error?.code === "INVALID_PROJECT_ID") {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    if (error?.code === "INVALID_TEAM_NAME") {
      return res.status(400).json({ error: "teamName is required" });
    }
    if (error?.code === "TEAM_NAME_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Team name already exists in this enterprise" });
    }
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error creating team:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createTeamForProjectHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  const projectId = Number(req.body?.projectId);
  const teamName = typeof req.body?.teamName === "string" ? req.body.teamName.trim() : "";

  if (!userId || isNaN(projectId) || !teamName) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const team = await createTeamForProject(userId, projectId, teamName);
    return res.status(201).json(team);
  } catch (error: any) {
    if (error?.code === "TEAM_CREATION_FORBIDDEN") {
      return res.status(403).json({ error: "Only students can create teams from this workspace" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "STUDENT_ALREADY_IN_TEAM") {
      return res.status(409).json({ error: "You are already assigned to a team in this project" });
    }
    if (error?.code === "INVALID_TEAM_NAME") {
      return res.status(400).json({ error: "teamName is required" });
    }
    if (error?.code === "TEAM_NAME_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Team name already exists in this enterprise" });
    }
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error creating team for project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function previewRandomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamCount = Number(req.query.teamCount);
  const seed = parseOptionalInteger(req.query.seed);
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
  if (seed === "invalid") {
    return res.status(400).json({ error: "seed must be an integer when provided" });
  }
  if (minTeamSize === "invalid") {
    return res.status(400).json({ error: "minTeamSize must be a positive integer when provided" });
  }
  if (maxTeamSize === "invalid") {
    return res.status(400).json({ error: "maxTeamSize must be a positive integer when provided" });
  }
  if (
    minTeamSize !== null &&
    minTeamSize !== "invalid" &&
    maxTeamSize !== null &&
    maxTeamSize !== "invalid" &&
    minTeamSize > maxTeamSize
  ) {
    return res.status(400).json({ error: "minTeamSize cannot be greater than maxTeamSize" });
  }
  try {
    const randomOptions: { seed?: number; minTeamSize?: number; maxTeamSize?: number } = {
      ...(seed !== null && seed !== "invalid" ? { seed } : {}),
      ...(minTeamSize !== null && minTeamSize !== "invalid" ? { minTeamSize } : {}),
      ...(maxTeamSize !== null && maxTeamSize !== "invalid" ? { maxTeamSize } : {}),
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

export async function listCustomAllocationQuestionnairesHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const parsedProjectId = parseCustomAllocationProjectId(req.params.projectId);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!parsedProjectId.ok) {
    return respondCustomAllocationValidationError(res, parsedProjectId.code);
  }

  try {
    const result = await listCustomAllocationQuestionnairesForProject(staffId, parsedProjectId.value);
    return res.json(result);
  } catch (error: any) {
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
    }
    if (error?.code === "CUSTOM_ALLOCATION_NOT_IMPLEMENTED") {
      return res.status(501).json({ error: "Customised allocation is not fully implemented yet" });
    }
    console.error("Error loading customised allocation questionnaires:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getCustomAllocationCoverageHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const parsedProjectId = parseCustomAllocationProjectId(req.params.projectId);
  const parsedQuestionnaireTemplateId = parseCustomAllocationCoverageTemplateId(
    req.query.questionnaireTemplateId,
  );

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!parsedProjectId.ok) {
    return respondCustomAllocationValidationError(res, parsedProjectId.code);
  }
  if (!parsedQuestionnaireTemplateId.ok) {
    return respondCustomAllocationValidationError(res, parsedQuestionnaireTemplateId.code);
  }

  try {
    const result = await getCustomAllocationCoverageForProject(
      staffId,
      parsedProjectId.value,
      parsedQuestionnaireTemplateId.value,
    );
    return res.json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_TEMPLATE_ID") {
      return res.status(400).json({ error: "questionnaireTemplateId must be a positive integer" });
    }
    if (error?.code === "TEMPLATE_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(403).json({ error: "Questionnaire template is not accessible" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
    }
    if (error?.code === "CUSTOM_ALLOCATION_NOT_IMPLEMENTED") {
      return res.status(501).json({ error: "Customised allocation is not fully implemented yet" });
    }
    console.error("Error loading customised allocation coverage:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function previewCustomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const parsedProjectId = parseCustomAllocationProjectId(req.params.projectId);
  const parsedPreviewInput = parseCustomAllocationPreviewBody(req.body);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!parsedProjectId.ok) {
    return respondCustomAllocationValidationError(res, parsedProjectId.code);
  }
  if (!parsedPreviewInput.ok) {
    return respondCustomAllocationValidationError(res, parsedPreviewInput.code);
  }

  try {
    const result = await previewCustomAllocationForProject(
      staffId,
      parsedProjectId.value,
      parsedPreviewInput.value,
    );
    return res.json(result);
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
    if (error?.code === "INVALID_TEMPLATE_ID") {
      return res.status(400).json({ error: "questionnaireTemplateId must be a positive integer" });
    }
    if (error?.code === "INVALID_NON_RESPONDENT_STRATEGY") {
      return res.status(400).json({
        error: "nonRespondentStrategy must be either 'distribute_randomly' or 'exclude'",
      });
    }
    if (error?.code === "INVALID_CRITERIA") {
      return res.status(400).json({
        error: "Each criterion must include a valid questionId, strategy, and weight between 1 and 5",
      });
    }
    if (error?.code === "TEAM_COUNT_EXCEEDS_STUDENT_COUNT") {
      return res.status(400).json({ error: "teamCount cannot be greater than available students" });
    }
    if (error?.code === "TEAM_SIZE_CONSTRAINTS_UNSATISFIABLE") {
      return res.status(400).json({
        error: "Current team size constraints cannot be satisfied for the generated allocation",
      });
    }
    if (error?.code === "TEMPLATE_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(403).json({ error: "Questionnaire template is not accessible" });
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
    if (error?.code === "CUSTOM_ALLOCATION_NOT_IMPLEMENTED") {
      return res.status(501).json({ error: "Customised allocation is not fully implemented yet" });
    }
    console.error("Error previewing customised team allocation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function applyRandomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const teamCount = Number(req.body?.teamCount);
  const seed = parseOptionalInteger(req.body?.seed);
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
  if (seed === "invalid") {
    return res.status(400).json({ error: "seed must be an integer when provided" });
  }
  if (minTeamSize === "invalid") {
    return res.status(400).json({ error: "minTeamSize must be a positive integer when provided" });
  }
  if (maxTeamSize === "invalid") {
    return res.status(400).json({ error: "maxTeamSize must be a positive integer when provided" });
  }
  if (
    minTeamSize !== null &&
    minTeamSize !== "invalid" &&
    maxTeamSize !== null &&
    maxTeamSize !== "invalid" &&
    minTeamSize > maxTeamSize
  ) {
    return res.status(400).json({ error: "minTeamSize cannot be greater than maxTeamSize" });
  }
  if (hasInvalidTeamNamesPayload) {
    return res.status(400).json({ error: "teamNames must be an array of strings when provided" });
  }

  try {
    const result = await applyRandomAllocationForProject(staffId, projectId, teamCount, {
      ...(seed !== null && seed !== "invalid" ? { seed } : {}),
      ...(teamNames !== undefined ? { teamNames } : {}),
      ...(minTeamSize !== null && minTeamSize !== "invalid" ? { minTeamSize } : {}),
      ...(maxTeamSize !== null && maxTeamSize !== "invalid" ? { maxTeamSize } : {}),
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

export async function applyCustomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const parsedProjectId = parseCustomAllocationProjectId(req.params.projectId);
  const parsedApplyInput = parseCustomAllocationApplyBody(req.body);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!parsedProjectId.ok) {
    return respondCustomAllocationValidationError(res, parsedProjectId.code);
  }
  if (!parsedApplyInput.ok) {
    return respondCustomAllocationValidationError(res, parsedApplyInput.code);
  }

  try {
    const result = await applyCustomAllocationForProject(
      staffId,
      parsedProjectId.value,
      parsedApplyInput.value,
    );
    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_PREVIEW_ID") {
      return res.status(400).json({ error: "previewId is required" });
    }
    if (error?.code === "INVALID_TEAM_NAMES") {
      return res.status(400).json({ error: "teamNames must contain one non-empty name per generated team" });
    }
    if (error?.code === "DUPLICATE_TEAM_NAMES") {
      return res.status(400).json({ error: "teamNames must be unique" });
    }
    if (error?.code === "PREVIEW_NOT_FOUND_OR_EXPIRED") {
      return res.status(409).json({ error: "Preview no longer exists. Generate a new preview and try again." });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "Project is archived" });
    }
    if (error?.code === "STUDENTS_NO_LONGER_VACANT") {
      const staleNames = formatCustomAllocationStaleStudentNames(error?.staleStudents);
      const errorMessage = staleNames
        ? `Some students are no longer vacant: ${staleNames}. Regenerate preview and try again.`
        : "Some students are no longer vacant. Regenerate preview and try again.";
      return res.status(409).json({
        error: errorMessage,
        ...(Array.isArray(error?.staleStudents) ? { staleStudents: error.staleStudents } : {}),
      });
    }
    if (error?.code === "TEAM_NAME_ALREADY_EXISTS") {
      return res.status(409).json({ error: "One or more team names already exist in this enterprise" });
    }
    if (error?.code === "CUSTOM_ALLOCATION_NOT_IMPLEMENTED") {
      return res.status(501).json({ error: "Customised allocation is not fully implemented yet" });
    }
    console.error("Error applying customised team allocation:", error);
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
  if (rawStudentIds === null || studentIds === null || studentIds.some((studentId: number) => Number.isNaN(studentId))) {
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

export async function getTeamByIdHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const team = await getTeamById(teamId);
    return res.json(team);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    console.error("Error fetching team:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function addUserToTeamHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);
  const userId = Number(req.body?.userId);
  const role = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : "MEMBER";

  if (isNaN(teamId) || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const allocation = await addUserToTeam(teamId, userId, role === "OWNER" ? "OWNER" : "MEMBER");
    return res.status(201).json(allocation);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    if (error?.code === "MEMBER_ALREADY_EXISTS") {
      return res.status(409).json({ error: "User already in team" });
    }
    console.error("Error adding user to team:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTeamMembersHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const members = await getTeamMembers(teamId);
    return res.json(members);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    console.error("Error fetching team members:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function transitionInviteHandler(
  req: Request,
  res: Response,
  transition: (inviteId: string) => Promise<unknown>,
  actionName: string,
) {
  const inviteId = typeof req.params.inviteId === "string" ? req.params.inviteId.trim() : "";
  if (!inviteId) {
    return res.status(400).json({ error: "Invalid invite ID" });
  }

  try {
    const invite = await transition(inviteId);
    return res.json({ ok: true, invite });
  } catch (error: any) {
    if (error?.code === "INVITE_NOT_PENDING") {
      return res.status(409).json({ error: "Invite is not pending" });
    }
    console.error(`Error ${actionName} team invite:`, error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function acceptTeamInviteHandler(req: AuthRequest, res: Response) {
  const inviteId = typeof req.params.inviteId === "string" ? req.params.inviteId.trim() : "";
  const userId = req.user?.sub;

  if (!inviteId) {
    return res.status(400).json({ error: "Invalid invite ID" });
  }
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const invite = await acceptTeamInvite(inviteId, userId);
    return res.json({ ok: true, invite });
  } catch (error: any) {
    if (error?.code === "INVITE_NOT_PENDING") {
      return res.status(409).json({ error: "Invite is not pending" });
    }
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(409).json({ error: "This team is no longer active" });
    }
    console.error("Error accepting team invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function declineTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, declineTeamInvite, "declining");
}

export async function rejectTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, rejectTeamInvite, "rejecting");
}

export async function cancelTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, cancelTeamInvite, "cancelling");
}

export async function expireTeamInviteHandler(req: Request, res: Response) {
  return transitionInviteHandler(req, res, expireTeamInvite, "expiring");
}
