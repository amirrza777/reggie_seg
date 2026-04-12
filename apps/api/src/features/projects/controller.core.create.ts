import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { sendProjectOrModuleArchivedConflict } from "../../shared/projectWriteGuard.js";
import { parseProjectDeadline } from "./deadlines/controller.deadline-parsers.js";
import { parsePositiveIntArray } from "../../shared/parse.js";
import { createProject } from "./service.js";
import { parsePositiveInt } from "./controller.shared.js";

function parseCreateProjectBody(body: any) {
  const { name, moduleId, questionnaireTemplateId, teamAllocationQuestionnaireTemplateId, informationText, deadline, studentIds } = body;

  const normalizedName = typeof name === "string" ? name.trim() : "";
  if (!normalizedName) return { ok: false as const, error: "Project name is required and must be a string" };
  if (normalizedName.length > 160) return { ok: false as const, error: "Project name must be 160 characters or fewer" };

  const parsedModuleId = parsePositiveInt(moduleId);
  const parsedTemplateId = parsePositiveInt(questionnaireTemplateId);
  if (!parsedModuleId || !parsedTemplateId) return { ok: false as const, error: "moduleId and questionnaireTemplateId must be positive integers" };

  let parsedTeamAllocationTemplateId: number | null = null;
  if (teamAllocationQuestionnaireTemplateId !== undefined && teamAllocationQuestionnaireTemplateId !== null) {
    parsedTeamAllocationTemplateId = parsePositiveInt(teamAllocationQuestionnaireTemplateId);
    if (!parsedTeamAllocationTemplateId) return { ok: false as const, error: "teamAllocationQuestionnaireTemplateId must be a positive integer when provided" };
  }

  let normalizedInformationText: string | null = null;
  if (typeof informationText === "string") {
    const trimmed = informationText.trim();
    normalizedInformationText = trimmed.length > 0 ? trimmed : null;
  } else if (informationText !== undefined && informationText !== null) {
    return { ok: false as const, error: "informationText must be a string when provided" };
  }

  const parsedDeadline = parseProjectDeadline(deadline);
  if (!parsedDeadline.ok) return { ok: false as const, error: parsedDeadline.error };

  let normalizedStudentIds: number[] | undefined;
  if (studentIds !== undefined) {
    const parsedStudentIds = parsePositiveIntArray(studentIds, "studentIds");
    if (!parsedStudentIds.ok) return { ok: false as const, error: parsedStudentIds.error };
    normalizedStudentIds = parsedStudentIds.value;
  }

  return { ok: true as const, data: { normalizedName, parsedModuleId, parsedTemplateId, parsedTeamAllocationTemplateId: parsedTeamAllocationTemplateId ?? undefined, normalizedInformationText, parsedDeadline: parsedDeadline.value, normalizedStudentIds } };
}

function mapCreateProjectErrorToResponse(error: unknown): [number, string] | null {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;
  const message = typeof error === "object" && error !== null && "message" in error ? (error as { message?: unknown }).message : undefined;

  const errorMap: Record<string, [number, string]> = {
    FORBIDDEN: [403, typeof message === "string" ? message : "Forbidden"],
    MODULE_NOT_FOUND: [404, "Module not found"],
    TEMPLATE_NOT_FOUND: [404, "Questionnaire template not found"],
    TEMPLATE_INVALID_PURPOSE: [400, "Questionnaire template must have PEER_ASSESSMENT purpose for project setup"],
    TEAM_ALLOCATION_TEMPLATE_NOT_FOUND: [404, "Team allocation questionnaire template not found"],
    TEAM_ALLOCATION_TEMPLATE_INVALID_PURPOSE: [400, "Team allocation questionnaire template must have CUSTOMISED_ALLOCATION purpose"],
    INVALID_STUDENT_IDS: [400, "studentIds must be a list of unique student ids"],
    STUDENTS_NOT_IN_MODULE: [400, "One or more selected students are not enrolled in this module"],
  };
  return code && code in errorMap ? errorMap[code] : null;
}

export async function createProjectHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  if (!actorUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const bodyResult = parseCreateProjectBody(req.body);
  if (!bodyResult.ok) {
    return res.status(400).json({ error: bodyResult.error });
  }

  const { normalizedName, parsedModuleId, parsedTemplateId, parsedTeamAllocationTemplateId, normalizedInformationText, parsedDeadline, normalizedStudentIds } = bodyResult.data;

  try {
    const project = await createProject(actorUserId, normalizedName, parsedModuleId, parsedTemplateId, parsedTeamAllocationTemplateId, normalizedInformationText, parsedDeadline, normalizedStudentIds);
    res.status(201).json(project);
  } catch (error: unknown) {
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    const mappedError = mapCreateProjectErrorToResponse(error);
    if (mappedError) {
      const [status, msg] = mappedError;
      return res.status(status).json({ error: msg });
    }
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
}
