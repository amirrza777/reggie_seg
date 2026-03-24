import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  createProject,
  fetchProjectById,
  fetchProjectsForUser,
  fetchModulesForUser,
  joinModuleByCode,
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
  updateTeamDeadlineProfileForStaff,
  fetchStaffStudentDeadlineOverrides,
  upsertStaffStudentDeadlineOverride,
  clearStaffStudentDeadlineOverride,
} from "./service.js";
import {
  parseAuthenticatedQueryUserId,
  parseAuthenticatedUserId,
  parseCreateProjectBody,
  parseDeadlineProfileBody,
  parseJoinModuleBody,
  parseModulesListQuery,
  parseProjectAndUserQuery,
  parseProjectIdParam,
  parseProjectTeamAndUserQuery,
  parseStaffStudentOverrideRoute,
  parseStudentDeadlineOverrideBody,
  parseTeamHealthMessageBody,
  parseTeamIdParam,
} from "./controller.parsers.js";

function isTeamLifecycleMigrationError(error: unknown) {
  const errorCode = (error as { code?: unknown } | null)?.code;
  return errorCode === "P2021" || errorCode === "P2022";
}

const TEAM_LIFECYCLE_MIGRATION_ERROR =
  "Team allocation lifecycle data is unavailable until the latest database migration is applied";
function resolveAuthenticatedUserId(req: AuthRequest, res: Response): number | null {
  const parsed = parseAuthenticatedQueryUserId(req);
  if (!parsed.ok) {
    const status = parsed.error === "Unauthorized" ? 401 : parsed.error === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: parsed.error });
    return null;
  }
  return parsed.value;
}

export async function createProjectHandler(req: AuthRequest, res: Response) {
  const actorUserId = parseAuthenticatedUserId(req);
  if (!actorUserId.ok) {
    return res.status(401).json({ error: actorUserId.error });
  }
  const parsedBody = parseCreateProjectBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const project = await createProject(
      actorUserId.value,
      parsedBody.value.name,
      parsedBody.value.moduleId,
      parsedBody.value.questionnaireTemplateId,
      parsedBody.value.deadline,
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
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const project = await fetchProjectById(projectId.value);
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

  const parsedQuery = parseModulesListQuery(req.query);
  if (!parsedQuery.ok) return res.status(400).json({ error: parsedQuery.error });

  try {
    const modules = await fetchModulesForUser(userId, parsedQuery.value);
    res.json(modules);
  } catch (error) {
    console.error("Error fetching user modules:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
}

export async function joinModuleHandler(req: AuthRequest, res: Response) {
  const actorUserId = parseAuthenticatedUserId(req);
  if (!actorUserId.ok) return res.status(401).json({ error: actorUserId.error });
  const parsedBody = parseJoinModuleBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await joinModuleByCode(actorUserId.value, parsedBody.value.code);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json(result.value);
  } catch (error) {
    console.error("Error joining module by code:", error);
    return res.status(500).json({ error: "Failed to join module" });
  }
}

/** Handles requests for get project deadline. */
export async function getProjectDeadlineHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = parseProjectIdParam(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const deadline = await fetchProjectDeadline(userId, projectId.value);
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
  const projectId = parseProjectIdParam(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const teammates = await fetchTeammatesForProject(userId, projectId.value);
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
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });

  try {
    const team = await fetchTeamById(teamId.value);
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
  const projectId = parseProjectIdParam(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const team = await fetchTeamByUserAndProject(userId, projectId.value);
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
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const project = await fetchQuestionsForProject(projectId.value);
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
  const projectId = parseProjectIdParam(req.params.projectId);
  if (userId === null) {
    return;
  }
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const result = await fetchProjectTeamsForStaff(userId, projectId.value);
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
  const projectId = parseProjectIdParam(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const marking = await fetchProjectMarking(userId, projectId.value);
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
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: "Invalid user ID or project ID" });
  const parsedBody = parseTeamHealthMessageBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const request = await submitTeamHealthMessage(
      parsedBody.value.userId,
      projectId.value,
      parsedBody.value.subject,
      parsedBody.value.details,
    );
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
  const parsed = parseProjectAndUserQuery(req as AuthRequest);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const requests = await fetchMyTeamHealthMessages(parsed.value.userId, parsed.value.projectId);
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
  const parsed = parseProjectTeamAndUserQuery(req as AuthRequest);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const requests = await fetchTeamHealthMessagesForStaff(parsed.value.userId, parsed.value.projectId, parsed.value.teamId);
    if (!requests) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.json({ requests });
  } catch (error) {
    console.error("Error fetching staff team team health messages:", error);
    return res.status(500).json({ error: "Failed to fetch team team health messages" });
  }
}

export async function updateTeamDeadlineProfileHandler(req: AuthRequest, res: Response) {
  const actorUserId = parseAuthenticatedUserId(req);
  if (!actorUserId.ok) return res.status(401).json({ error: actorUserId.error });
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });
  const deadlineProfile = parseDeadlineProfileBody(req.body);
  if (!deadlineProfile.ok) return res.status(400).json({ error: deadlineProfile.error });

  try {
    const updated = await updateTeamDeadlineProfileForStaff(actorUserId.value, teamId.value, deadlineProfile.value);
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

export async function getStaffStudentDeadlineOverridesHandler(req: AuthRequest, res: Response) {
  const actorUserId = parseAuthenticatedUserId(req);
  if (!actorUserId.ok) return res.status(401).json({ error: actorUserId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const overrides = await fetchStaffStudentDeadlineOverrides(actorUserId.value, projectId.value);
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
  const parsedRoute = parseStaffStudentOverrideRoute(req);
  if (!parsedRoute.ok) {
    const status = parsedRoute.error === "Unauthorized" ? 401 : 400;
    return res.status(status).json({ error: parsedRoute.error });
  }

  const parsed = parseStudentDeadlineOverrideBody(req.body);
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
    const override = await upsertStaffStudentDeadlineOverride(
      parsedRoute.value.actorUserId,
      parsedRoute.value.projectId,
      parsedRoute.value.studentId,
      parsed.value,
    );
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
  const parsedRoute = parseStaffStudentOverrideRoute(req);
  if (!parsedRoute.ok) {
    const status = parsedRoute.error === "Unauthorized" ? 401 : 400;
    return res.status(status).json({ error: parsedRoute.error });
  }

  try {
    const result = await clearStaffStudentDeadlineOverride(
      parsedRoute.value.actorUserId,
      parsedRoute.value.projectId,
      parsedRoute.value.studentId,
    );
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
