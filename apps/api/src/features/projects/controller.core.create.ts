import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { sendProjectOrModuleArchivedConflict } from "../../shared/projectWriteGuard.js";
import { parseProjectDeadline } from "./deadlines/controller.deadline-parsers.js";
import { parsePositiveIntArray } from "../../shared/parse.js";
import { createProject } from "./service.js";
import { parsePositiveInt } from "./controller.shared.js";

export async function createProjectHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const {
    name,
    moduleId,
    questionnaireTemplateId,
    teamAllocationQuestionnaireTemplateId,
    informationText,
    deadline,
    studentIds,
  } = req.body as {
    name?: unknown;
    moduleId?: unknown;
    questionnaireTemplateId?: unknown;
    teamAllocationQuestionnaireTemplateId?: unknown;
    informationText?: unknown;
    deadline?: unknown;
    studentIds?: unknown;
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

  let parsedTeamAllocationTemplateId: number | null = null;
  if (teamAllocationQuestionnaireTemplateId !== undefined && teamAllocationQuestionnaireTemplateId !== null) {
    parsedTeamAllocationTemplateId = parsePositiveInt(teamAllocationQuestionnaireTemplateId);
    if (!parsedTeamAllocationTemplateId) {
      return res.status(400).json({
        error: "teamAllocationQuestionnaireTemplateId must be a positive integer when provided",
      });
    }
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

  let normalizedStudentIds: number[] | undefined;
  if (studentIds !== undefined) {
    const parsedStudentIds = parsePositiveIntArray(studentIds, "studentIds");
    if (!parsedStudentIds.ok) {
      return res.status(400).json({ error: parsedStudentIds.error });
    }
    normalizedStudentIds = parsedStudentIds.value;
  }

  try {
    const project = await createProject(
      actorUserId,
      normalizedName,
      parsedModuleId,
      parsedTemplateId,
      parsedTeamAllocationTemplateId ?? undefined,
      normalizedInformationText,
      parsedDeadline.value,
      normalizedStudentIds,
    );
    res.status(201).json(project);
  } catch (error: unknown) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : undefined;

    if (errorCode === "FORBIDDEN") {
      return res.status(403).json({ error: typeof errorMessage === "string" ? errorMessage : "Forbidden" });
    }
    if (errorCode === "MODULE_NOT_FOUND") {
      return res.status(404).json({ error: "Module not found" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    if (errorCode === "TEMPLATE_NOT_FOUND") {
      return res.status(404).json({ error: "Questionnaire template not found" });
    }
    if (errorCode === "TEMPLATE_INVALID_PURPOSE") {
      return res.status(400).json({
        error: "Questionnaire template must have PEER_ASSESSMENT purpose for project setup",
      });
    }
    if (errorCode === "TEAM_ALLOCATION_TEMPLATE_NOT_FOUND") {
      return res.status(404).json({ error: "Team allocation questionnaire template not found" });
    }
    if (errorCode === "TEAM_ALLOCATION_TEMPLATE_INVALID_PURPOSE") {
      return res.status(400).json({
        error: "Team allocation questionnaire template must have CUSTOMISED_ALLOCATION purpose",
      });
    }
    if (errorCode === "INVALID_STUDENT_IDS") {
      return res.status(400).json({ error: "studentIds must be a list of unique student ids" });
    }
    if (errorCode === "STUDENTS_NOT_IN_MODULE") {
      return res.status(400).json({ error: "One or more selected students are not enrolled in this module" });
    }
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
}
