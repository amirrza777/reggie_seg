import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  createProject,
  fetchProjectById,
  fetchProjectDeadline,
  fetchProjectMarking,
  fetchProjectTeamsForStaff,
  fetchProjectsForStaff,
  fetchProjectsForUser,
  fetchModulesForUser,
  fetchQuestionsForProject,
  fetchTeamById,
  fetchTeamByUserAndProject,
  fetchTeammatesForProject,
} from "./service.js";
import {
  parseAuthenticatedQueryUserId,
  parseAuthenticatedUserId,
  parseCreateProjectBody,
  parseModulesListQuery,
  parseProjectIdParam,
  parseTeamIdParam,
} from "./controller.parsers.js";

export async function createProjectHandler(req: AuthRequest, res: Response) {
  const actorUserId = parseAuthenticatedUserId(req);
  if (!actorUserId.ok) return res.status(401).json({ error: actorUserId.error });
  const parsedBody = parseCreateProjectBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

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

export async function getUserProjectsHandler(req: AuthRequest, res: Response) {
  const userId = parseAuthenticatedQueryUserId(req);
  if (!userId.ok) {
    const status = userId.error === "Unauthorized" ? 401 : userId.error === "Forbidden" ? 403 : 400;
    return res.status(status).json({ error: userId.error });
  }

  try {
    const projects = await fetchProjectsForUser(userId.value);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}

export async function getUserModulesHandler(req: AuthRequest, res: Response) {
  const userId = parseAuthenticatedQueryUserId(req);
  if (!userId.ok) {
    const status = userId.error === "Unauthorized" ? 401 : userId.error === "Forbidden" ? 403 : 400;
    return res.status(status).json({ error: userId.error });
  }
  const parsedQuery = parseModulesListQuery(req.query);
  if (!parsedQuery.ok) return res.status(400).json({ error: parsedQuery.error });

  try {
    const modules = await fetchModulesForUser(userId.value, parsedQuery.value);
    res.json(modules);
  } catch (error) {
    console.error("Error fetching user modules:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
}

export async function getProjectDeadlineHandler(req: AuthRequest, res: Response) {
  const userId = parseAuthenticatedQueryUserId(req);
  if (!userId.ok) {
    const status = userId.error === "Unauthorized" ? 401 : userId.error === "Forbidden" ? 403 : 400;
    return res.status(status).json({ error: userId.error });
  }
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const deadline = await fetchProjectDeadline(userId.value, projectId.value);
    res.json({ deadline });
  } catch (error) {
    console.error("Error fetching project deadline:", error);
    res.status(500).json({ error: "Failed to fetch project deadline" });
  }
}

export async function getTeammatesForProjectHandler(req: AuthRequest, res: Response) {
  const userId = parseAuthenticatedQueryUserId(req);
  if (!userId.ok) {
    const status = userId.error === "Unauthorized" ? 401 : userId.error === "Forbidden" ? 403 : 400;
    return res.status(status).json({ error: userId.error });
  }
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const teammates = await fetchTeammatesForProject(userId.value, projectId.value);
    res.json({ teammates });
  } catch (error) {
    console.error("Error fetching teammates for project:", error);
    res.status(500).json({ error: "Failed to fetch teammates" });
  }
}

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
    console.error("Error fetching team:", error);
    res.status(500).json({ error: "Failed to fetch team" });
  }
}

export async function getTeamByUserAndProjectHandler(req: AuthRequest, res: Response) {
  const userId = parseAuthenticatedQueryUserId(req);
  if (!userId.ok) {
    const status = userId.error === "Unauthorized" ? 401 : userId.error === "Forbidden" ? 403 : 400;
    return res.status(status).json({ error: userId.error });
  }
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const team = await fetchTeamByUserAndProject(userId.value, projectId.value);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ error: "Failed to fetch team" });
  }
}

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

export async function getStaffProjectsHandler(req: AuthRequest, res: Response) {
  const userId = parseAuthenticatedQueryUserId(req);
  if (!userId.ok) {
    const status = userId.error === "Unauthorized" ? 401 : userId.error === "Forbidden" ? 403 : 400;
    return res.status(status).json({ error: userId.error });
  }

  try {
    const projects = await fetchProjectsForStaff(userId.value);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching staff projects:", error);
    res.status(500).json({ error: "Failed to fetch staff projects" });
  }
}

export async function getStaffProjectTeamsHandler(req: AuthRequest, res: Response) {
  const userId = parseAuthenticatedQueryUserId(req);
  if (!userId.ok) {
    const status = userId.error === "Unauthorized" ? 401 : userId.error === "Forbidden" ? 403 : 400;
    return res.status(status).json({ error: userId.error });
  }
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const result = await fetchProjectTeamsForStaff(userId.value, projectId.value);
    if (!result) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(result);
  } catch (error) {
    console.error("Error fetching staff project teams:", error);
    res.status(500).json({ error: "Failed to fetch staff project teams" });
  }
}

export async function getProjectMarkingHandler(req: AuthRequest, res: Response) {
  const userId = parseAuthenticatedQueryUserId(req);
  if (!userId.ok) {
    const status = userId.error === "Unauthorized" ? 401 : userId.error === "Forbidden" ? 403 : 400;
    return res.status(status).json({ error: userId.error });
  }
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const marking = await fetchProjectMarking(userId.value, projectId.value);
    if (!marking) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    res.json(marking);
  } catch (error) {
    console.error("Error fetching project marking:", error);
    res.status(500).json({ error: "Failed to fetch project marking" });
  }
}
