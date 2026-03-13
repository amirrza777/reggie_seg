import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
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
  updateTeamDeadlineProfileForStaff,
} from "./service.js";

function parsePositiveInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

function parseIsoDate(value: unknown, field: keyof ParsedProjectDeadline): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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

  const { name, moduleId, questionnaireTemplateId, deadline } = req.body as {
    name?: unknown;
    moduleId?: unknown;
    questionnaireTemplateId?: unknown;
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

export async function getUserProjectsHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const projects = await fetchProjectsForUser(userId);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}

export async function getUserModulesHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const scope = req.query.scope === "staff" ? "staff" : "workspace";

  try {
    const modules = await fetchModulesForUser(userId, { staffOnly: scope === "staff" });
    res.json(modules);
  } catch (error) {
    console.error("Error fetching user modules:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
}

export async function getProjectDeadlineHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);

  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const deadline = await fetchProjectDeadline(userId, projectId);
    res.json({ deadline });
  } catch (error) {
    console.error("Error fetching project deadline:", error);
    res.status(500).json({ error: "Failed to fetch project deadline" });
  }
}

export async function getTeammatesForProjectHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);

  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const teammates = await fetchTeammatesForProject(userId, projectId);
    res.json({ teammates });
  } catch (error) {
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
    console.error("Error fetching team:", error);
    res.status(500).json({ error: "Failed to fetch team" });
  }
}

export async function getTeamByUserAndProjectHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);

  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const team = await fetchTeamByUserAndProject(userId, projectId);
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

export async function getStaffProjectsHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const projects = await fetchProjectsForStaff(userId);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching staff projects:", error);
    res.status(500).json({ error: "Failed to fetch staff projects" });
  }
}

export async function getStaffProjectTeamsHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
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
    console.error("Error fetching staff project teams:", error);
    res.status(500).json({ error: "Failed to fetch staff project teams" });
  }
}

export async function getProjectMarkingHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);

  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const marking = await fetchProjectMarking(userId, projectId);
    if (!marking) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    res.json(marking);
  } catch (error) {
    console.error("Error fetching project marking:", error);
    res.status(500).json({ error: "Failed to fetch project marking" });
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
