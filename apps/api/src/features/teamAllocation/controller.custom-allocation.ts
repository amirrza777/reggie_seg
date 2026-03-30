import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  parseCustomAllocationApplyBody,
  parseCustomAllocationCoverageTemplateId,
  parseCustomAllocationPreviewBody,
  parseCustomAllocationProjectId,
} from "./customAllocation.validation.js";
import {
  applyCustomAllocationForProject,
  getCustomAllocationCoverageForProject,
  listCustomAllocationQuestionnairesForProject,
  previewCustomAllocationForProject,
} from "./service.js";
import {
  formatCustomAllocationStaleStudentNames,
  respondCustomAllocationValidationError,
} from "./controller.shared.js";

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
    if (error?.code === "TEMPLATE_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(403).json({ error: "Questionnaire template is not accessible" });
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
    if (error?.code === "TEMPLATE_NOT_ALLOWED") {
      return res.status(403).json({ error: "Questionnaire template is not available for this project" });
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
    if (error?.code === "TEMPLATE_NOT_ALLOWED") {
      return res.status(403).json({ error: "Questionnaire template is not available for this project" });
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
