import type { Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import { sendProjectOrModuleArchivedConflict } from "../../../shared/projectWriteGuard.js";
import {
  parseProjectDeadline,
  type ParsedProjectDeadline,
} from "../deadlines/controller.deadline-parsers.js";
import { parsePositiveIntArray } from "../../../shared/parse.js";
import { parsePositiveInt, resolveAuthenticatedUserId } from "../controller.shared.js";
import {
  canStaffMutateProjectManageSettings,
  deleteStaffProjectManage,
  getStaffProjectManageSummary,
  patchStaffProjectManage,
  type StaffProjectManageSummaryRow,
} from "./repo.js";

function parseArchived(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return undefined;
  return value;
}

function iso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toISOString();
}

type AccessPerson = { id: number; email: string; firstName: string; lastName: string };

function mapUserToAccessPerson(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}): AccessPerson {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function buildProjectAccessFromRow(row: StaffProjectManageSummaryRow) {
  const moduleLeaders = row.module.moduleLeads.map((l) => mapUserToAccessPerson(l.user)).sort((a, b) => {
    const ln = a.lastName.localeCompare(b.lastName);
    return ln !== 0 ? ln : a.firstName.localeCompare(b.firstName);
  });
  const moduleTeachingAssistants = row.module.moduleTeachingAssistants
    .map((t) => mapUserToAccessPerson(t.user))
    .sort((a, b) => {
      const ln = a.lastName.localeCompare(b.lastName);
      return ln !== 0 ? ln : a.firstName.localeCompare(b.firstName);
    });
  const leadTa = new Set<number>([
    ...row.module.moduleLeads.map((l) => l.user.id),
    ...row.module.moduleTeachingAssistants.map((t) => t.user.id),
  ]);
  const seen = new Set<number>();
  const moduleMemberDirectory: AccessPerson[] = [];
  for (const um of row.module.userModules) {
    if (leadTa.has(um.userId)) continue;
    if (seen.has(um.user.id)) continue;
    seen.add(um.user.id);
    moduleMemberDirectory.push(mapUserToAccessPerson(um.user));
  }
  moduleMemberDirectory.sort((a, b) => {
    const ln = a.lastName.localeCompare(b.lastName);
    return ln !== 0 ? ln : a.firstName.localeCompare(b.firstName);
  });
  const projectStudentIds = [...row.projectStudents.map((p) => p.userId)].sort((a, b) => a - b);
  return {
    moduleLeaders,
    moduleTeachingAssistants,
    moduleMemberDirectory,
    projectStudentIds,
  };
}

export function mapStaffProjectManageRowToJson(row: StaffProjectManageSummaryRow) {
  const dl = row.deadline;
  return {
    id: row.id,
    name: row.name,
    archivedAt: row.archivedAt ? new Date(row.archivedAt).toISOString() : null,
    moduleId: row.moduleId,
    informationText: row.informationText,
    moduleArchivedAt: row.module.archivedAt ? new Date(row.module.archivedAt).toISOString() : null,
    questionnaireTemplateId: row.questionnaireTemplateId,
    questionnaireTemplate: row.questionnaireTemplate
      ? { id: row.questionnaireTemplate.id, templateName: row.questionnaireTemplate.templateName }
      : null,
    projectDeadline: dl
      ? {
          taskOpenDate: iso(dl.taskOpenDate),
          taskDueDate: iso(dl.taskDueDate),
          taskDueDateMcf: iso(dl.taskDueDateMcf),
          assessmentOpenDate: iso(dl.assessmentOpenDate),
          assessmentDueDate: iso(dl.assessmentDueDate),
          assessmentDueDateMcf: iso(dl.assessmentDueDateMcf),
          feedbackOpenDate: iso(dl.feedbackOpenDate),
          feedbackDueDate: iso(dl.feedbackDueDate),
          feedbackDueDateMcf: iso(dl.feedbackDueDateMcf),
          teamAllocationQuestionnaireOpenDate: iso(dl.teamAllocationQuestionnaireOpenDate),
          teamAllocationQuestionnaireDueDate: iso(dl.teamAllocationQuestionnaireDueDate),
        }
      : null,
    hasSubmittedPeerAssessments: row._count.peerAssessments > 0,
    projectAccess: buildProjectAccessFromRow(row),
  };
}

export async function getStaffProjectManageHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const row = await getStaffProjectManageSummary(actorUserId, projectId);
    if (!row) {
      return res.status(404).json({ error: "Project not found" });
    }
    const canMutateProjectSettings = await canStaffMutateProjectManageSettings(actorUserId, row.moduleId);
    return res.json({ ...mapStaffProjectManageRowToJson(row), canMutateProjectSettings });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message ?? "Forbidden" });
    }
    if (err?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error fetching staff project manage summary:", error);
    return res.status(500).json({ error: "Failed to load project settings" });
  }
}

export async function patchStaffProjectManageHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);
  const nameRaw = req.body?.name;
  const archived = parseArchived(req.body?.archived);
  const templateIdRaw = req.body?.questionnaireTemplateId;

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  const hasName = nameRaw !== undefined;
  if (hasName && typeof nameRaw !== "string") {
    return res.status(400).json({ error: "name must be a string" });
  }
  const hasArchived = archived !== undefined;
  if (req.body?.archived !== undefined && !hasArchived) {
    return res.status(400).json({ error: "archived must be a boolean" });
  }

  const hasTemplate = templateIdRaw !== undefined;
  let questionnaireTemplateId: number | undefined;
  if (hasTemplate) {
    const tid = parsePositiveInt(templateIdRaw);
    if (!tid) {
      return res.status(400).json({ error: "questionnaireTemplateId must be a positive integer" });
    }
    questionnaireTemplateId = tid;
  }

  let deadlinePayload: ParsedProjectDeadline | undefined;
  const hasDeadline = req.body?.deadline !== undefined;
  if (hasDeadline) {
    const parsedDl = parseProjectDeadline(req.body.deadline);
    if (!parsedDl.ok) {
      return res.status(400).json({ error: parsedDl.error });
    }
    deadlinePayload = parsedDl.value;
  }

  const body = req.body as Record<string, unknown> | undefined;
  const hasInformationText = body != null && Object.prototype.hasOwnProperty.call(body, "informationText");
  let informationText: string | null | undefined;
  if (hasInformationText) {
    const raw = body!.informationText;
    if (raw === null) {
      informationText = null;
    } else if (typeof raw === "string") {
      informationText = raw;
    } else {
      return res.status(400).json({ error: "informationText must be a string or null" });
    }
  }

  const hasProjectStudentIds = body != null && Object.prototype.hasOwnProperty.call(body, "projectStudentIds");
  let projectStudentIds: number[] | undefined;
  if (hasProjectStudentIds) {
    const parsedIds = parsePositiveIntArray(body!.projectStudentIds, "projectStudentIds");
    if (!parsedIds.ok) {
      return res.status(400).json({ error: parsedIds.error });
    }
    projectStudentIds = parsedIds.value;
  }

  if (!hasName && !hasArchived && !hasTemplate && !hasDeadline && !hasInformationText && !hasProjectStudentIds) {
    return res.status(400).json({
      error:
        "Provide name, archived, questionnaireTemplateId, deadline, informationText, and/or projectStudentIds",
    });
  }

  try {
    const updated = await patchStaffProjectManage(actorUserId, projectId, {
      ...(hasName ? { name: nameRaw as string } : {}),
      ...(hasArchived ? { archived: archived as boolean } : {}),
      ...(hasTemplate ? { questionnaireTemplateId: questionnaireTemplateId! } : {}),
      ...(hasDeadline ? { deadline: deadlinePayload } : {}),
      ...(hasInformationText ? { informationText: informationText as string | null } : {}),
      ...(hasProjectStudentIds ? { projectStudentIds: projectStudentIds! } : {}),
    });
    if (!updated) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(mapStaffProjectManageRowToJson(updated));
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message ?? "Forbidden" });
    }
    if (err?.code === "PROJECT_NOT_FOUND" || err?.code === "PROJECT_DEADLINE_NOT_FOUND") {
      return res.status(404).json({ error: err.message ?? "Project not found" });
    }
    if (err?.code === "INVALID_NAME") {
      return res.status(400).json({ error: err.message ?? "Invalid project name" });
    }
    if (err?.code === "MODULE_ARCHIVED") {
      return res.status(409).json({ error: err.message ?? "Module is archived" });
    }
    if (err?.code === "PEER_ASSESSMENTS_EXIST") {
      return res.status(409).json({ error: err.message ?? "Peer assessments already exist" });
    }
    if (
      err?.code === "TEMPLATE_NOT_FOUND" ||
      err?.code === "TEMPLATE_INVALID_PURPOSE" ||
      err?.code === "TEAM_ALLOCATION_TEMPLATE_NOT_FOUND" ||
      err?.code === "TEAM_ALLOCATION_TEMPLATE_INVALID_PURPOSE"
    ) {
      return res.status(400).json({ error: err.message ?? "Invalid questionnaire template" });
    }
    if (err?.code === "INVALID_INFORMATION_TEXT" || err?.code === "INVALID_PROJECT_STUDENTS") {
      return res.status(400).json({ error: err.message ?? "Invalid request" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error updating staff project settings:", error);
    return res.status(500).json({ error: "Failed to update project settings" });
  }
}

export async function deleteStaffProjectManageHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const { moduleId } = await deleteStaffProjectManage(actorUserId, projectId);
    return res.json({ moduleId });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message ?? "Forbidden" });
    }
    if (err?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error deleting staff project:", error);
    return res.status(500).json({ error: "Failed to delete project" });
  }
}
