import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  createProject,
  fetchProjectById,
  fetchProjectDeadline,
  fetchProjectMarking,
  fetchProjectTeamsForStaff,
  fetchProjectsForStaff,
  fetchProjectsForUser,
  fetchModulesForUser,
  fetchModuleStaffList,
  fetchModuleStudentProjectMatrix,
  fetchQuestionsForProject,
  fetchTeamById,
  fetchTeamByUserAndProject,
  fetchTeammatesForProject,
} from "./service.js";
import {
  parsePositiveInt,
  resolveAuthenticatedUserId,
  isTeamLifecycleMigrationError,
  TEAM_LIFECYCLE_MIGRATION_ERROR,
} from "./controller.shared.js";
import { parseProjectDeadline } from "./controller.deadline-parsers.js";

export async function createProjectHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, moduleId, questionnaireTemplateId, informationText, deadline } = req.body as {
    name?: unknown;
    moduleId?: unknown;
    questionnaireTemplateId?: unknown;
    informationText?: unknown;
    deadline?: unknown;
  };

  const normalizedName = typeof name === "string" ? name.trim() : "";
  if (!normalizedName) {
    return res.status(400).json({ error: "Project name is required and must be a string" });
  }

  if (normalizedName.length > 160) {
    return res.status(400).json({ error: "Project name must be 160 characters or fewer" });
  }

  const parsedModuleId = parsePositiveInt(moduleId);
  const parsedTemplateId = parsePositiveInt(questionnaireTemplateId);
  if (!parsedModuleId || !parsedTemplateId) {
    return res.status(400).json({ error: "moduleId and questionnaireTemplateId must be positive integers" });
  }

  let normalizedInformationText: string | null = null;
  if (typeof informationText === "string") {
    const trimmed = informationText.trim();
    normalizedInformationText = trimmed.length > 0 ? trimmed : null;
  } else if (informationText !== undefined && informationText !== null) {
    return res.status(400).json({ error: "informationText must be a string when provided" });
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

/** Module leads + TAs (for staff module pages). */
export async function getModuleStaffListHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) {
    return;
  }

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (moduleId === null) {
    return res.status(400).json({ error: "Invalid module id" });
  }

  try {
    const result = await fetchModuleStaffList(userId, moduleId);
    if (!result.ok) {
      return res.status(result.status).json({ error: "Forbidden" });
    }
    return res.json({ members: result.members });
  } catch (error) {
    console.error("Error fetching module staff list:", error);
    return res.status(500).json({ error: "Failed to fetch module staff" });
  }
}

/** Enrolled students × project team matrix for a module (staff workspace). */
export async function getModuleStudentProjectMatrixHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) {
    return;
  }

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (moduleId === null) {
    return res.status(400).json({ error: "Invalid module id" });
  }

  try {
    const result = await fetchModuleStudentProjectMatrix(userId, moduleId);
    if (!result.ok) {
      return res.status(result.status).json({ error: "Forbidden" });
    }
    return res.json({ projects: result.projects, students: result.students });
  } catch (error) {
    console.error("Error fetching module student project matrix:", error);
    return res.status(500).json({ error: "Failed to fetch student project matrix" });
  }
}

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
