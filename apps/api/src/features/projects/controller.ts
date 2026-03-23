import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  createProject,
  fetchProjectById,
  fetchProjectsForUser,
  fetchModulesForUser,
  fetchProjectDeadline,
  fetchTeammatesForProject,
  fetchTeamById,
  fetchTeamByUserAndProject,
  fetchQuestionsForProject,
  fetchProjectsForStaff,
  fetchProjectTeamsForStaff,
  fetchProjectMarking,
  submitTeamHealthMessage,
  fetchMyTeamHealthMessages,
  fetchTeamHealthMessagesForStaff,
  createTeamWarningForStaff,
  fetchTeamWarningsForStaff,
  resolveTeamWarningForStaff,
  fetchMyTeamWarnings,
  updateTeamDeadlineProfileForStaff,
  fetchProjectWarningsConfigForStaff,
  fetchProjectNavFlagsConfigForStaff,
  updateProjectNavFlagsConfigForStaff,
  updateProjectWarningsConfigForStaff,
  evaluateProjectWarningsForStaff,
  fetchStaffStudentDeadlineOverrides,
  upsertStaffStudentDeadlineOverride,
  clearStaffStudentDeadlineOverride,
} from "./service.js";

function parsePositiveInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isTeamLifecycleMigrationError(error: unknown) {
  const errorCode = (error as { code?: unknown } | null)?.code;
  return errorCode === "P2021" || errorCode === "P2022";
}

const TEAM_LIFECYCLE_MIGRATION_ERROR =
  "Team allocation lifecycle data is unavailable until the latest database migration is applied";
function resolveAuthenticatedUserId(req: AuthRequest, res: Response): number | null {
  const authUserId = req.user?.sub;
  if (!authUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const queryUserId = req.query.userId;
  if (queryUserId !== undefined) {
    const parsedQueryUserId = Number(queryUserId);
    if (Number.isNaN(parsedQueryUserId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return null;
    }
    if (parsedQueryUserId !== authUserId) {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }
  }

  return authUserId;
}

/** Handles requests for create project. */
type ParsedProjectDeadline = {
  taskOpenDate: Date;
  taskDueDate: Date;
  taskDueDateMcf: Date;
  assessmentOpenDate: Date;
  assessmentDueDate: Date;
  assessmentDueDateMcf: Date;
  feedbackOpenDate: Date;
  feedbackDueDate: Date;
  feedbackDueDateMcf: Date;
};

type ParsedStudentDeadlineOverride = {
  taskOpenDate?: Date | null;
  taskDueDate?: Date | null;
  assessmentOpenDate?: Date | null;
  assessmentDueDate?: Date | null;
  feedbackOpenDate?: Date | null;
  feedbackDueDate?: Date | null;
  reason?: string | null;
};

function parseIsoDate(value: unknown, field: keyof ParsedProjectDeadline): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseOptionalIsoDateField(
  value: unknown,
  fieldName: keyof Omit<ParsedStudentDeadlineOverride, "reason">,
): { ok: true; value: Date | null | undefined } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${fieldName} must be a valid date string, null, or omitted` };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: `${fieldName} must be a valid date string` };
  }
  return { ok: true, value: parsed };
}

function parseStudentDeadlineOverridePayload(
  value: unknown,
): { ok: true; value: ParsedStudentDeadlineOverride } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Override payload must be an object" };
  }

  const raw = value as Record<string, unknown>;
  const taskOpenDate = parseOptionalIsoDateField(raw.taskOpenDate, "taskOpenDate");
  if (!taskOpenDate.ok) return taskOpenDate;
  const taskDueDate = parseOptionalIsoDateField(raw.taskDueDate, "taskDueDate");
  if (!taskDueDate.ok) return taskDueDate;
  const assessmentOpenDate = parseOptionalIsoDateField(raw.assessmentOpenDate, "assessmentOpenDate");
  if (!assessmentOpenDate.ok) return assessmentOpenDate;
  const assessmentDueDate = parseOptionalIsoDateField(raw.assessmentDueDate, "assessmentDueDate");
  if (!assessmentDueDate.ok) return assessmentDueDate;
  const feedbackOpenDate = parseOptionalIsoDateField(raw.feedbackOpenDate, "feedbackOpenDate");
  if (!feedbackOpenDate.ok) return feedbackOpenDate;
  const feedbackDueDate = parseOptionalIsoDateField(raw.feedbackDueDate, "feedbackDueDate");
  if (!feedbackDueDate.ok) return feedbackDueDate;

  let reason: string | null | undefined = undefined;
  if (raw.reason !== undefined) {
    if (raw.reason === null || raw.reason === "") {
      reason = null;
    } else if (typeof raw.reason === "string") {
      const normalizedReason = raw.reason.trim();
      reason = normalizedReason.length > 0 ? normalizedReason : null;
    } else {
      return { ok: false, error: "reason must be a string, null, or omitted" };
    }
  }

  return {
    ok: true,
    value: {
      ...(taskOpenDate.value !== undefined ? { taskOpenDate: taskOpenDate.value } : {}),
      ...(taskDueDate.value !== undefined ? { taskDueDate: taskDueDate.value } : {}),
      ...(assessmentOpenDate.value !== undefined ? { assessmentOpenDate: assessmentOpenDate.value } : {}),
      ...(assessmentDueDate.value !== undefined ? { assessmentDueDate: assessmentDueDate.value } : {}),
      ...(feedbackOpenDate.value !== undefined ? { feedbackOpenDate: feedbackOpenDate.value } : {}),
      ...(feedbackDueDate.value !== undefined ? { feedbackDueDate: feedbackDueDate.value } : {}),
      ...(reason !== undefined ? { reason } : {}),
    },
  };
}

function parseProjectDeadline(value: unknown): { ok: true; value: ParsedProjectDeadline } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "deadline is required" };
  }

  const taskOpenDate = parseIsoDate((value as any).taskOpenDate, "taskOpenDate");
  const taskDueDate = parseIsoDate((value as any).taskDueDate, "taskDueDate");
  const taskDueDateMcf = parseIsoDate((value as any).taskDueDateMcf, "taskDueDateMcf");
  const assessmentOpenDate = parseIsoDate((value as any).assessmentOpenDate, "assessmentOpenDate");
  const assessmentDueDate = parseIsoDate((value as any).assessmentDueDate, "assessmentDueDate");
  const assessmentDueDateMcf = parseIsoDate((value as any).assessmentDueDateMcf, "assessmentDueDateMcf");
  const feedbackOpenDate = parseIsoDate((value as any).feedbackOpenDate, "feedbackOpenDate");
  const feedbackDueDate = parseIsoDate((value as any).feedbackDueDate, "feedbackDueDate");
  const feedbackDueDateMcf = parseIsoDate((value as any).feedbackDueDateMcf, "feedbackDueDateMcf");

  if (!taskOpenDate) return { ok: false, error: "deadline.taskOpenDate must be a valid date string" };
  if (!taskDueDate) return { ok: false, error: "deadline.taskDueDate must be a valid date string" };
  if (!taskDueDateMcf) return { ok: false, error: "deadline.taskDueDateMcf must be a valid date string" };
  if (!assessmentOpenDate) return { ok: false, error: "deadline.assessmentOpenDate must be a valid date string" };
  if (!assessmentDueDate) return { ok: false, error: "deadline.assessmentDueDate must be a valid date string" };
  if (!assessmentDueDateMcf) return { ok: false, error: "deadline.assessmentDueDateMcf must be a valid date string" };
  if (!feedbackOpenDate) return { ok: false, error: "deadline.feedbackOpenDate must be a valid date string" };
  if (!feedbackDueDate) return { ok: false, error: "deadline.feedbackDueDate must be a valid date string" };
  if (!feedbackDueDateMcf) return { ok: false, error: "deadline.feedbackDueDateMcf must be a valid date string" };

  if (taskOpenDate >= taskDueDate) {
    return { ok: false, error: "deadline.taskOpenDate must be before deadline.taskDueDate" };
  }
  if (taskDueDate > assessmentOpenDate) {
    return { ok: false, error: "deadline.assessmentOpenDate must be on or after deadline.taskDueDate" };
  }
  if (assessmentOpenDate >= assessmentDueDate) {
    return { ok: false, error: "deadline.assessmentOpenDate must be before deadline.assessmentDueDate" };
  }
  if (assessmentDueDate > feedbackOpenDate) {
    return { ok: false, error: "deadline.feedbackOpenDate must be on or after deadline.assessmentDueDate" };
  }
  if (feedbackOpenDate >= feedbackDueDate) {
    return { ok: false, error: "deadline.feedbackOpenDate must be before deadline.feedbackDueDate" };
  }
  if (taskDueDateMcf < taskDueDate) {
    return { ok: false, error: "deadline.taskDueDateMcf must be on or after deadline.taskDueDate" };
  }
  if (assessmentDueDateMcf < assessmentDueDate) {
    return { ok: false, error: "deadline.assessmentDueDateMcf must be on or after deadline.assessmentDueDate" };
  }
  if (feedbackDueDateMcf < feedbackDueDate) {
    return { ok: false, error: "deadline.feedbackDueDateMcf must be on or after deadline.feedbackDueDate" };
  }

  return {
    ok: true,
    value: {
      taskOpenDate,
      taskDueDate,
      taskDueDateMcf,
      assessmentOpenDate,
      assessmentDueDate,
      assessmentDueDateMcf,
      feedbackOpenDate,
      feedbackDueDate,
      feedbackDueDateMcf,
    },
  };
}

export async function createProjectHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, moduleId, questionnaireTemplateId, deadline, informationText } = req.body as {
    name?: unknown;
    moduleId?: unknown;
    questionnaireTemplateId?: unknown;
    deadline?: unknown;
    informationText?: unknown;
  };

  const normalizedName = typeof name === "string" ? name.trim() : "";
  if (!normalizedName) {
    return res.status(400).json({ error: "Project name is required and must be a string" });
  }

  if (normalizedName.length > 160) {
    return res.status(400).json({ error: "Project name must be 160 characters or fewer" });
  }

  const normalizedInformationTextRaw =
    typeof informationText === "string" ? informationText.trim() : "";
  const normalizedInformationText =
    normalizedInformationTextRaw.length > 0 ? normalizedInformationTextRaw : null;
  if (normalizedInformationText && normalizedInformationText.length > 8_000) {
    return res.status(400).json({ error: "informationText must be 8000 characters or fewer" });
  }

  const parsedModuleId = parsePositiveInt(moduleId);
  const parsedTemplateId = parsePositiveInt(questionnaireTemplateId);
  if (!parsedModuleId || !parsedTemplateId) {
    return res.status(400).json({ error: "moduleId and questionnaireTemplateId must be positive integers" });
  }

  const parsedDeadline = parseProjectDeadline(deadline);
  if (!parsedDeadline.ok) {
    return res.status(400).json({ error: parsedDeadline.error });
  }

  try {
    const project = await createProject(
      actorUserId,
      normalizedName,
      parsedModuleId,
      parsedTemplateId,
      normalizedInformationText,
      parsedDeadline.value,
    );
    res.status(201).json(project);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "MODULE_NOT_FOUND") {
      return res.status(404).json({ error: "Module not found" });
    }
    if (error?.code === "TEMPLATE_NOT_FOUND") {
      return res.status(404).json({ error: "Questionnaire template not found" });
    }
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
}

/** Handles requests for get project by ID. */
export async function getProjectByIdHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const project = await fetchProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
}

/** Handles requests for get user projects. */
export async function getUserProjectsHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) {
    return;
  }

  try {
    const projects = await fetchProjectsForUser(userId);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}

/** Handles requests for get user modules. */
export async function getUserModulesHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) {
    return;
  }

  const scope = req.query.scope === "staff" ? "staff" : "workspace";
  const compact = req.query.compact === "1";
  const parsedSearchQuery = parseSearchQuery(req.query.q);
  if (!parsedSearchQuery.ok) {
    return res.status(400).json({ error: parsedSearchQuery.error });
  }

  try {
    const options: { staffOnly: boolean; compact: boolean; query?: string | null } = {
      staffOnly: scope === "staff",
      compact,
    };
    if (parsedSearchQuery.value) {
      options.query = parsedSearchQuery.value;
    }
    const modules = await fetchModulesForUser(userId, options);
    res.json(modules);
  } catch (error) {
    console.error("Error fetching user modules:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
}

/** Handles requests for get project deadline. */
export async function getProjectDeadlineHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const deadline = await fetchProjectDeadline(userId, projectId);
    res.json({ deadline });
  } catch (error) {
    if (isTeamLifecycleMigrationError(error)) {
      return res.status(503).json({ error: TEAM_LIFECYCLE_MIGRATION_ERROR });
    }
    console.error("Error fetching project deadline:", error);
    res.status(500).json({ error: "Failed to fetch project deadline" });
  }
}

/** Handles requests for get teammates for project. */
export async function getTeammatesForProjectHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const teammates = await fetchTeammatesForProject(userId, projectId);
    res.json({ teammates });
  } catch (error) {
    if (isTeamLifecycleMigrationError(error)) {
      return res.status(503).json({ error: TEAM_LIFECYCLE_MIGRATION_ERROR });
    }
    console.error("Error fetching teammates for project:", error);
    res.status(500).json({ error: "Failed to fetch teammates" });
  }
}

/** Handles requests for get team by ID. */
export async function getTeamByIdHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);

  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const team = await fetchTeamById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  } catch (error) {
    if (isTeamLifecycleMigrationError(error)) {
      return res.status(503).json({ error: TEAM_LIFECYCLE_MIGRATION_ERROR });
    }
    console.error("Error fetching team:", error);
    res.status(500).json({ error: "Failed to fetch team" });
  }
}

/** Handles requests for get team by user and project. */
export async function getTeamByUserAndProjectHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const team = await fetchTeamByUserAndProject(userId, projectId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  } catch (error) {
    if (isTeamLifecycleMigrationError(error)) {
      return res.status(503).json({ error: TEAM_LIFECYCLE_MIGRATION_ERROR });
    }
    console.error("Error fetching team:", error);
    res.status(500).json({ error: "Failed to fetch team" });
  }
}

/** Handles requests for get questions for project. */
export async function getQuestionsForProjectHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);

  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const project = await fetchQuestionsForProject(projectId);
    if (!project || !project.questionnaireTemplate) {
      return res.status(404).json({ error: "Questionnaire template not found for this project" });
    }
    res.json(project.questionnaireTemplate);
  } catch (error) {
    console.error("Error fetching questions for project:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
}

/** Handles requests for get staff projects. */
export async function getStaffProjectsHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) {
    return;
  }
  const parsedSearchQuery = parseSearchQuery(req.query.q);
  if (!parsedSearchQuery.ok) {
    return res.status(400).json({ error: parsedSearchQuery.error });
  }

  try {
    const projects = parsedSearchQuery.value
      ? await fetchProjectsForStaff(userId, { query: parsedSearchQuery.value })
      : await fetchProjectsForStaff(userId);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching staff projects:", error);
    res.status(500).json({ error: "Failed to fetch staff projects" });
  }
}

/** Handles requests for get staff project teams. */
export async function getStaffProjectTeamsHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);
  if (userId === null) {
    return;
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const result = await fetchProjectTeamsForStaff(userId, projectId);
    if (!result) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(result);
  } catch (error) {
    if (isTeamLifecycleMigrationError(error)) {
      return res.status(503).json({ error: TEAM_LIFECYCLE_MIGRATION_ERROR });
    }
    console.error("Error fetching staff project teams:", error);
    res.status(500).json({ error: "Failed to fetch staff project teams" });
  }
}

/** Handles requests for get project marking. */
export async function getProjectMarkingHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const marking = await fetchProjectMarking(userId, projectId);
    if (!marking) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    res.json(marking);
  } catch (error) {
    if (isTeamLifecycleMigrationError(error)) {
      return res.status(503).json({ error: TEAM_LIFECYCLE_MIGRATION_ERROR });
    }
    console.error("Error fetching project marking:", error);
    res.status(500).json({ error: "Failed to fetch project marking" });
  }
}

export async function createTeamHealthMessageHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const userId = Number((req.body as { userId?: unknown }).userId);
  const subjectRaw = (req.body as { subject?: unknown }).subject;
  const detailsRaw = (req.body as { details?: unknown }).details;

  if (Number.isNaN(projectId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  if (typeof subjectRaw !== "string" || typeof detailsRaw !== "string") {
    return res.status(400).json({ error: "subject and details are required strings" });
  }

  const subject = subjectRaw.trim();
  const details = detailsRaw.trim();
  if (!subject || !details) {
    return res.status(400).json({ error: "subject and details cannot be empty" });
  }

  try {
    const request = await submitTeamHealthMessage(userId, projectId, subject, details);
    if (!request) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    return res.status(201).json({ request });
  } catch (error) {
    console.error("Error creating team health message:", error);
    return res.status(500).json({ error: "Failed to create team health message" });
  }
}

export async function getMyTeamHealthMessagesHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const userId = Number(req.query.userId);

  if (Number.isNaN(projectId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const requests = await fetchMyTeamHealthMessages(userId, projectId);
    if (!requests) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    return res.json({ requests });
  } catch (error) {
    console.error("Error fetching user team health messages:", error);
    return res.status(500).json({ error: "Failed to fetch team health messages" });
  }
}

export async function getStaffTeamHealthMessagesHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const userId = Number(req.query.userId);

  if (Number.isNaN(projectId) || Number.isNaN(teamId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID, project ID, or team ID" });
  }

  try {
    const requests = await fetchTeamHealthMessagesForStaff(userId, projectId, teamId);
    if (!requests) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.json({ requests });
  } catch (error) {
    console.error("Error fetching staff team team health messages:", error);
    return res.status(500).json({ error: "Failed to fetch team team health messages" });
  }
}

export async function createStaffTeamWarningHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const typeRaw = req.body?.type;
  const severityRaw = req.body?.severity;
  const titleRaw = req.body?.title;
  const detailsRaw = req.body?.details;

  if (userId === null) {
    return;
  }
  if (Number.isNaN(projectId) || Number.isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid project ID or team ID" });
  }
  if (typeof typeRaw !== "string" || !typeRaw.trim()) {
    return res.status(400).json({ error: "type is required" });
  }
  if (typeof severityRaw !== "string" || !["LOW", "MEDIUM", "HIGH"].includes(severityRaw)) {
    return res.status(400).json({ error: "severity must be LOW, MEDIUM, or HIGH" });
  }
  if (typeof titleRaw !== "string" || !titleRaw.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (typeof detailsRaw !== "string" || !detailsRaw.trim()) {
    return res.status(400).json({ error: "details are required" });
  }

  const type = typeRaw.trim().slice(0, 64);
  const title = titleRaw.trim().slice(0, 160);
  const details = detailsRaw.trim();

  try {
    const warning = await createTeamWarningForStaff(userId, projectId, teamId, {
      type,
      severity: severityRaw as "LOW" | "MEDIUM" | "HIGH",
      title,
      details,
    });
    if (!warning) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.status(201).json({ warning });
  } catch (error: any) {
    if (error?.code === "WARNINGS_DISABLED") {
      return res.status(409).json({ error: error.message || "Warnings are disabled for this project" });
    }
    console.error("Error creating team warning:", error);
    return res.status(500).json({ error: "Failed to create team warning" });
  }
}

export async function getStaffTeamWarningsHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);

  if (userId === null) {
    return;
  }
  if (Number.isNaN(projectId) || Number.isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid project ID or team ID" });
  }

  try {
    const warnings = await fetchTeamWarningsForStaff(userId, projectId, teamId);
    if (!warnings) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.json({ warnings });
  } catch (error) {
    console.error("Error fetching staff team warnings:", error);
    return res.status(500).json({ error: "Failed to fetch team warnings" });
  }
}

export async function resolveStaffTeamWarningHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);
  const teamId = parsePositiveInt(req.params.teamId);
  const warningId = parsePositiveInt(req.params.warningId);

  if (userId === null) {
    return;
  }
  if (projectId === null || teamId === null || warningId === null) {
    return res.status(400).json({ error: "Invalid project ID, team ID, or warning ID" });
  }

  try {
    const warning = await resolveTeamWarningForStaff(userId, projectId, teamId, warningId);
    if (!warning) {
      return res.status(404).json({ error: "Warning not found for this staff scope" });
    }
    return res.json({ warning });
  } catch (error) {
    console.error("Error resolving staff team warning:", error);
    return res.status(500).json({ error: "Failed to resolve team warning" });
  }
}

export async function getMyTeamWarningsHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const warnings = await fetchMyTeamWarnings(userId, projectId);
    if (!warnings) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    return res.json({ warnings });
  } catch (error) {
    console.error("Error fetching my team warnings:", error);
    return res.status(500).json({ error: "Failed to fetch team warnings" });
  }
}

export async function updateTeamDeadlineProfileHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const teamId = Number(req.params.teamId);
  const deadlineProfile = req.body?.deadlineProfile;

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }
  if (deadlineProfile !== "STANDARD" && deadlineProfile !== "MCF") {
    return res.status(400).json({ error: "deadlineProfile must be STANDARD or MCF" });
  }

  try {
    const updated = await updateTeamDeadlineProfileForStaff(actorUserId, teamId, deadlineProfile);
    return res.json(updated);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    console.error("Error updating team deadline profile:", error);
    return res.status(500).json({ error: "Failed to update team deadline profile" });
  }
}

export async function getProjectWarningsConfigHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const projectId = Number(req.params.projectId);

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
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
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error fetching project warning config:", error);
    return res.status(500).json({ error: "Failed to fetch project warning config" });
  }
}

export async function getProjectNavFlagsConfigHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const projectId = Number(req.params.projectId);

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
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
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error fetching project nav flags config:", error);
    return res.status(500).json({ error: "Failed to fetch project nav flags config" });
  }
}

export async function updateProjectNavFlagsConfigHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const projectNavFlags = req.body?.projectNavFlags;

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
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
      return res.status(400).json({ error: error.message || "Invalid project nav flags config" });
    }
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error updating project nav flags config:", error);
    return res.status(500).json({ error: "Failed to update project nav flags config" });
  }
}

export async function updateProjectWarningsConfigHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const warningsConfig = req.body?.warningsConfig;

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
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
      return res.status(400).json({ error: error.message || "Invalid warnings config" });
    }
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error updating project warning config:", error);
    return res.status(500).json({ error: "Failed to update project warning config" });
  }
}

export async function evaluateProjectWarningsHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const projectId = Number(req.params.projectId);

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const evaluation = await evaluateProjectWarningsForStaff(actorUserId, projectId);
    if (!evaluation) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(evaluation);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error evaluating project warnings:", error);
    return res.status(500).json({ error: "Failed to evaluate project warnings" });
  }
}

export async function getStaffStudentDeadlineOverridesHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const projectId = Number(req.params.projectId);

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const overrides = await fetchStaffStudentDeadlineOverrides(actorUserId, projectId);
    return res.json({ overrides });
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error fetching staff student deadline overrides:", error);
    return res.status(500).json({ error: "Failed to fetch student deadline overrides" });
  }
}

export async function upsertStaffStudentDeadlineOverrideHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const studentId = Number(req.params.studentId);

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId) || Number.isNaN(studentId)) {
    return res.status(400).json({ error: "Invalid project ID or student ID" });
  }

  const parsed = parseStudentDeadlineOverridePayload(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  const hasAnyField =
    parsed.value.taskOpenDate !== undefined ||
    parsed.value.taskDueDate !== undefined ||
    parsed.value.assessmentOpenDate !== undefined ||
    parsed.value.assessmentDueDate !== undefined ||
    parsed.value.feedbackOpenDate !== undefined ||
    parsed.value.feedbackDueDate !== undefined ||
    parsed.value.reason !== undefined;
  if (!hasAnyField) {
    return res.status(400).json({ error: "At least one override field is required" });
  }

  try {
    const override = await upsertStaffStudentDeadlineOverride(actorUserId, projectId, studentId, parsed.value);
    return res.json({ override });
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "STUDENT_NOT_IN_PROJECT") {
      return res.status(404).json({ error: "Student not found in project" });
    }
    console.error("Error upserting student deadline override:", error);
    return res.status(500).json({ error: "Failed to update student deadline override" });
  }
}

export async function clearStaffStudentDeadlineOverrideHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  const projectId = Number(req.params.projectId);
  const studentId = Number(req.params.studentId);

  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (Number.isNaN(projectId) || Number.isNaN(studentId)) {
    return res.status(400).json({ error: "Invalid project ID or student ID" });
  }

  try {
    const result = await clearStaffStudentDeadlineOverride(actorUserId, projectId, studentId);
    return res.json(result);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error clearing student deadline override:", error);
    return res.status(500).json({ error: "Failed to clear student deadline override" });
  }
}
