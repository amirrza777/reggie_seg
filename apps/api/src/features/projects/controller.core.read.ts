import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import { readSingleQueryString } from "../../shared/searchParams.js";
import {
  fetchProjectById,
  fetchProjectDeadline,
  fetchProjectMarking,
  fetchProjectTeamsForStaff,
  fetchProjectsForStaff,
  fetchProjectsWithTeamsForStaffMarking,
  fetchProjectsForUser,
  fetchQuestionsForProject,
  fetchTeamAllocationQuestionnaireForProject,
  fetchTeamAllocationQuestionnaireStatusForUser,
  submitTeamAllocationQuestionnaireResponse,
  fetchTeamById,
  fetchTeamByUserAndProject,
  fetchTeammatesForProject,
} from "./service.js";
import {
  resolveAuthenticatedUserId,
  isTeamLifecycleMigrationError,
  TEAM_LIFECYCLE_MIGRATION_ERROR,
} from "./controller.shared.js";
import { AssessmentAnswerValidationError } from "../peerAssessment/answers.js";

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

  const rawModuleId = readSingleQueryString(req.query.moduleId);
  let parsedModuleId: number | undefined;
  if (rawModuleId !== undefined && rawModuleId.trim() !== "") {
    const moduleId = Number(rawModuleId);
    if (!Number.isInteger(moduleId) || moduleId <= 0) {
      return res.status(400).json({ error: "moduleId must be a positive integer" });
    }
    parsedModuleId = moduleId;
  }

  try {
    const projects = await fetchProjectsForStaff(userId, {
      query: parsedSearchQuery.value ?? undefined,
      moduleId: parsedModuleId,
    });
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

export async function getStaffMarkingProjectsHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) return;

  const parsedSearchQuery = parseSearchQuery(req.query.q);
  if (!parsedSearchQuery.ok) {
    return res.status(400).json({ error: parsedSearchQuery.error });
  }

  try {
    const projects = await fetchProjectsWithTeamsForStaffMarking(userId, {
      query: parsedSearchQuery.value ?? undefined,
    });
    res.json(projects);
  } catch (error) {
    console.error("Error fetching staff marking projects:", error);
    res.status(500).json({ error: "Failed to fetch marking projects" });
  }
}

export async function getTeamAllocationQuestionnaireForProjectHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);

  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const project = await fetchTeamAllocationQuestionnaireForProject(projectId);
    if (!project || !project.teamAllocationQuestionnaireTemplate) {
      return res.status(404).json({ error: "Team allocation questionnaire template not found for this project" });
    }
    res.json(project.teamAllocationQuestionnaireTemplate);
  } catch (error) {
    console.error("Error fetching team allocation questionnaire for project:", error);
    res.status(500).json({ error: "Failed to fetch team allocation questionnaire" });
  }
}

export async function getTeamAllocationQuestionnaireStatusForProjectHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const status = await fetchTeamAllocationQuestionnaireStatusForUser(userId, projectId);
    if (!status) {
      return res.status(404).json({ error: "Team allocation questionnaire template not found for this project" });
    }
    return res.json(status);
  } catch (error) {
    console.error("Error fetching team allocation questionnaire status:", error);
    return res.status(500).json({ error: "Failed to fetch team allocation questionnaire status" });
  }
}

export async function submitTeamAllocationQuestionnaireResponseHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  const projectId = Number(req.params.projectId);

  if (userId === null) {
    return;
  }
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  const answersJson = req.body?.answersJson;
  if (answersJson == null) {
    return res.status(400).json({ error: "answersJson is required" });
  }

  try {
    const result = await submitTeamAllocationQuestionnaireResponse(userId, projectId, answersJson);
    return res.status(201).json({ response: result });
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;

    if (code === "PROJECT_OR_TEMPLATE_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Team allocation questionnaire template not found for this project" });
    }
    if (code === "TEMPLATE_INVALID_PURPOSE") {
      return res.status(400).json({ error: "Questionnaire template must have CUSTOMISED_ALLOCATION purpose" });
    }
    if (code === "TEMPLATE_CONTAINS_UNSUPPORTED_QUESTION_TYPES") {
      return res.status(400).json({
        error: "Custom allocation questionnaires can only include multiple-choice, rating, or slider questions",
      });
    }
    if (code === "QUESTIONNAIRE_WINDOW_NOT_OPEN") {
      return res.status(409).json({ error: "The team allocation questionnaire is not open yet" });
    }
    if (code === "QUESTIONNAIRE_WINDOW_CLOSED") {
      return res.status(409).json({ error: "The team allocation questionnaire deadline has passed" });
    }
    if (code === "USER_ALREADY_IN_TEAM") {
      return res.status(409).json({ error: "You are already assigned to a team in this project" });
    }
    if (error instanceof AssessmentAnswerValidationError) {
      return res.status(400).json({ error: error.message });
    }

    console.error("Error saving team allocation questionnaire response:", error);
    return res.status(500).json({ error: "Failed to submit team allocation questionnaire response" });
  }
}
