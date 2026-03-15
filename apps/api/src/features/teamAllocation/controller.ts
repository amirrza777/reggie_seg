import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
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
  getCustomAllocationCoverageForProject,
  listCustomAllocationQuestionnairesForProject,
  getManualAllocationWorkspaceForProject,
  previewCustomAllocationForProject,
  previewRandomAllocationForProject,
} from "./service.js";

export async function createTeamInviteHandler(req: Request, res: Response) {
  const teamId = Number(req.body?.teamId);
  const inviterId = Number(req.body?.inviterId);
  const inviteeEmail = typeof req.body?.inviteeEmail === "string" ? req.body.inviteeEmail : "";
  const inviteeId = req.body?.inviteeId ? Number(req.body.inviteeId) : undefined;
  const message = typeof req.body?.message === "string" ? req.body.message : undefined;

  if (isNaN(teamId) || isNaN(inviterId) || !inviteeEmail) {
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
    if (error?.code === "TEAM_ARCHIVED") {
      return res.status(409).json({ error: "This team is archived and cannot accept new invites" });
    }
    if (error?.code === "INVITE_ALREADY_PENDING") {
      return res.status(409).json({ error: "Invite already pending" });
    }
    console.error("Error creating team invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listTeamInvitesHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const invites = await listTeamInvites(teamId);
    return res.json(invites);
  } catch (error) {
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

export async function createTeamHandler(req: Request, res: Response) {
  const userId = Number(req.body?.userId);
  const teamData = req.body?.teamData;

  if (isNaN(userId) || !teamData) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const team = await createTeam(userId, teamData);
    return res.status(201).json(team);
  } catch (error) {
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

export async function getManualAllocationWorkspaceHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const workspace = await getManualAllocationWorkspaceForProject(staffId, projectId);
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

export async function listCustomAllocationQuestionnairesHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const result = await listCustomAllocationQuestionnairesForProject(staffId, projectId);
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
  const projectId = Number(req.params.projectId);
  const questionnaireTemplateId = Number(req.query.questionnaireTemplateId);

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (!Number.isInteger(questionnaireTemplateId) || questionnaireTemplateId < 1) {
    return res.status(400).json({ error: "questionnaireTemplateId must be a positive integer" });
  }

  try {
    const result = await getCustomAllocationCoverageForProject(staffId, projectId, questionnaireTemplateId);
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
  const projectId = Number(req.params.projectId);
  const questionnaireTemplateId = Number(req.body?.questionnaireTemplateId);
  const teamCount = Number(req.body?.teamCount);
  const rawSeed = req.body?.seed;
  const seed = rawSeed === undefined || rawSeed === null || rawSeed === "" ? undefined : Number(rawSeed);
  const nonRespondentStrategy = req.body?.nonRespondentStrategy;
  const rawCriteria = req.body?.criteria;

  if (!staffId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (!Number.isInteger(questionnaireTemplateId) || questionnaireTemplateId < 1) {
    return res.status(400).json({ error: "questionnaireTemplateId must be a positive integer" });
  }
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    return res.status(400).json({ error: "teamCount must be a positive integer" });
  }
  if (seed !== undefined && Number.isNaN(seed)) {
    return res.status(400).json({ error: "seed must be a number when provided" });
  }
  if (nonRespondentStrategy !== "distribute_randomly" && nonRespondentStrategy !== "exclude") {
    return res.status(400).json({
      error: "nonRespondentStrategy must be either 'distribute_randomly' or 'exclude'",
    });
  }
  if (!Array.isArray(rawCriteria)) {
    return res.status(400).json({ error: "criteria must be an array" });
  }

  const normalizedCriteria = rawCriteria.map((criterion: any) => ({
    questionId: Number(criterion?.questionId),
    strategy: criterion?.strategy,
    weight: Number(criterion?.weight),
  }));

  const hasInvalidCriteria = normalizedCriteria.some(
    (criterion) =>
      !Number.isInteger(criterion.questionId) ||
      criterion.questionId < 1 ||
      (criterion.strategy !== "diversify" &&
        criterion.strategy !== "group" &&
        criterion.strategy !== "ignore") ||
      !Number.isInteger(criterion.weight) ||
      criterion.weight < 1 ||
      criterion.weight > 5,
  );
  if (hasInvalidCriteria) {
    return res.status(400).json({
      error: "Each criterion must include a valid questionId, strategy, and weight between 1 and 5",
    });
  }

  try {
    const result = await previewCustomAllocationForProject(staffId, projectId, {
      questionnaireTemplateId,
      teamCount,
      ...(seed !== undefined ? { seed } : {}),
      nonRespondentStrategy,
      criteria: normalizedCriteria,
    });
    return res.json(result);
  } catch (error: any) {
    if (error?.code === "INVALID_TEAM_COUNT") {
      return res.status(400).json({ error: "teamCount must be a positive integer" });
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

export async function applyCustomAllocationHandler(req: AuthRequest, res: Response) {
  const staffId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const previewId = typeof req.body?.previewId === "string" ? req.body.previewId.trim() : "";
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
  if (!previewId) {
    return res.status(400).json({ error: "previewId is required" });
  }
  if (hasInvalidTeamNamesPayload) {
    return res.status(400).json({ error: "teamNames must be an array of strings when provided" });
  }

  try {
    const result = await applyCustomAllocationForProject(staffId, projectId, {
      previewId,
      ...(teamNames !== undefined ? { teamNames } : {}),
    });
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
      return res.status(409).json({ error: "Some students are no longer vacant. Regenerate preview and try again." });
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