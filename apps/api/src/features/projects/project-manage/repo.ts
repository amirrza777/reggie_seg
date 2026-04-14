import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db.js";
import { wherePeerAssessmentIsPeerReview } from "../../peerAssessment/peerAssessmentPurposeWhere.js";
import { assertProjectMutableForWritesByProjectId } from "../../../shared/projectWriteGuard.js";
import { assertTemplatePurpose } from "../repo/repo.project-write.js";
import type { ProjectDeadlineInput } from "../repo/repo.types.js";

const MAX_PROJECT_NAME_LENGTH = 200;

const MANAGE_SUMMARY_SELECT = {
  id: true,
  name: true,
  archivedAt: true,
  moduleId: true,
  informationText: true,
  questionnaireTemplateId: true,
  questionnaireTemplate: {
    select: { id: true, templateName: true },
  },
  module: {
    select: {
      archivedAt: true,
      enterpriseId: true,
      moduleLeads: {
        select: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        },
      },
      moduleTeachingAssistants: {
        select: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        },
      },
      userModules: {
        select: {
          userId: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        },
      },
    },
  },
  projectStudents: {
    select: { userId: true },
  },
  deadline: {
    select: {
      taskOpenDate: true,
      taskDueDate: true,
      taskDueDateMcf: true,
      assessmentOpenDate: true,
      assessmentDueDate: true,
      assessmentDueDateMcf: true,
      feedbackOpenDate: true,
      feedbackDueDate: true,
      feedbackDueDateMcf: true,
      teamAllocationQuestionnaireOpenDate: true,
      teamAllocationQuestionnaireDueDate: true,
      teamAllocationInviteDueDate: true,
    },
  },
  _count: {
    select: { peerAssessments: { where: wherePeerAssessmentIsPeerReview } },
  },
} as const;

export type StaffProjectManageSummaryRow = Prisma.ProjectGetPayload<{ select: typeof MANAGE_SUMMARY_SELECT }>;

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

export async function getStaffProjectManageScope(actorUserId: number, projectId: number) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN" as const, message: "User not found" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  const isStaffLead = actor.role === "STAFF";
  if (!roleCanAccessAll && !isStaffLead) {
    throw {
      code: "FORBIDDEN" as const,
      message: "Only module leads and admins can manage project settings",
    };
  }

  const projectInEnterprise = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: actor.enterpriseId,
      },
    },
    select: { id: true },
  });

  if (!projectInEnterprise) {
    throw { code: "PROJECT_NOT_FOUND" as const };
  }

  if (!roleCanAccessAll) {
    const leadAccess = await prisma.project.findFirst({
      where: {
        id: projectId,
        module: {
          enterpriseId: actor.enterpriseId,
          moduleLeads: { some: { userId: actorUserId } },
        },
      },
      select: { id: true },
    });

    if (!leadAccess) {
      throw {
        code: "FORBIDDEN" as const,
        message: "Only module leads and admins can manage project settings",
      };
    }
  }

  return projectInEnterprise;
}

export async function getStaffProjectManageSummary(
  actorUserId: number,
  projectId: number,
): Promise<StaffProjectManageSummaryRow | null> {
  await getStaffProjectManageScope(actorUserId, projectId);
  return prisma.project.findUnique({
    where: { id: projectId },
    select: MANAGE_SUMMARY_SELECT,
  });
}

export type StaffProjectManagePatch = {
  name?: string;
  archived?: boolean;
  questionnaireTemplateId?: number;
  deadline?: ProjectDeadlineInput;
  informationText?: string | null;
  projectStudentIds?: number[];
};

const MAX_INFORMATION_TEXT_LENGTH = 8000;

async function resolveAllowedProjectStudentIds(
  tx: Prisma.TransactionClient,
  moduleId: number,
  enterpriseId: string,
  requestedIds: number[]
): Promise<number[]> {
  const [leadRows, taRows] = await Promise.all([
    tx.moduleLead.findMany({ where: { moduleId }, select: { userId: true } }),
    tx.moduleTeachingAssistant.findMany({ where: { moduleId }, select: { userId: true } }),
  ]);
  const blocked = new Set<number>([
    ...leadRows.map((r) => r.userId),
    ...taRows.map((r) => r.userId),
  ]);
  const unique = [...new Set(requestedIds)].filter((id) => !blocked.has(id));
  if (unique.length === 0) {
    return [];
  }
  const enrolled = await tx.userModule.findMany({
    where: { moduleId, enterpriseId, userId: { in: unique } },
    select: { userId: true },
  });
  const allowed = new Set(enrolled.map((e) => e.userId));
  return unique.filter((id) => allowed.has(id));
}

function projectDeadlineUpdateData(deadline: ProjectDeadlineInput): Prisma.ProjectDeadlineUpdateInput {
  return {
    taskOpenDate: deadline.taskOpenDate,
    taskDueDate: deadline.taskDueDate,
    taskDueDateMcf: deadline.taskDueDateMcf,
    assessmentOpenDate: deadline.assessmentOpenDate,
    assessmentDueDate: deadline.assessmentDueDate,
    assessmentDueDateMcf: deadline.assessmentDueDateMcf,
    feedbackOpenDate: deadline.feedbackOpenDate,
    feedbackDueDate: deadline.feedbackDueDate,
    feedbackDueDateMcf: deadline.feedbackDueDateMcf,
    teamAllocationQuestionnaireOpenDate: deadline.teamAllocationQuestionnaireOpenDate ?? null,
    teamAllocationQuestionnaireDueDate: deadline.teamAllocationQuestionnaireDueDate ?? null,
    teamAllocationInviteDueDate: deadline.teamAllocationInviteDueDate ?? null,
  };
}

export async function patchStaffProjectManage(
  actorUserId: number,
  projectId: number,
  body: StaffProjectManagePatch,
): Promise<StaffProjectManageSummaryRow | null> {
  const scope = await getStaffProjectManageScope(actorUserId, projectId);
  const hasName = body.name !== undefined;
  const hasArchived = body.archived !== undefined;
  const hasTemplate = body.questionnaireTemplateId !== undefined;
  const hasDeadline = body.deadline !== undefined;
  const hasInformationText = body.informationText !== undefined;
  const hasProjectStudentIds = body.projectStudentIds !== undefined;

  if (!hasName && !hasArchived && !hasTemplate && !hasDeadline && !hasInformationText && !hasProjectStudentIds) {
    throw { code: "EMPTY_PATCH" as const, message: "No updates provided" };
  }

  const data: Prisma.ProjectUpdateInput = {};

  if (hasName) {
    await assertProjectMutableForWritesByProjectId(scope.id);
    const normalized = typeof body.name === "string" ? body.name.trim() : "";
    if (!normalized) {
      throw { code: "INVALID_NAME" as const, message: "Project name is required" };
    }
    if (normalized.length > MAX_PROJECT_NAME_LENGTH) {
      throw {
        code: "INVALID_NAME" as const,
        message: `Project name must be at most ${MAX_PROJECT_NAME_LENGTH} characters`,
      };
    }
    data.name = normalized;
  }

  if (hasArchived) {
    if (body.archived) {
      data.archivedAt = new Date();
    } else {
      const row = await prisma.project.findUnique({
        where: { id: scope.id },
        select: { module: { select: { archivedAt: true } } },
      });
      if (row?.module.archivedAt) {
        throw {
          code: "MODULE_ARCHIVED" as const,
          message: "Cannot unarchive this project while its module is archived",
        };
      }
      data.archivedAt = null;
    }
  }

  if (hasTemplate) {
    await assertProjectMutableForWritesByProjectId(scope.id);
    const submittedCount = await prisma.peerAssessment.count({
      where: { projectId: scope.id, ...wherePeerAssessmentIsPeerReview },
    });
    if (submittedCount > 0) {
      throw {
        code: "PEER_ASSESSMENTS_EXIST" as const,
        message: "Cannot change the peer assessment questionnaire after assessments have been submitted.",
      };
    }
    await assertTemplatePurpose(body.questionnaireTemplateId!, "PEER_ASSESSMENT");
    data.questionnaireTemplate = { connect: { id: body.questionnaireTemplateId! } };
  }

  if (hasDeadline) {
    await assertProjectMutableForWritesByProjectId(scope.id);
    const existing = await prisma.projectDeadline.findUnique({
      where: { projectId: scope.id },
      select: { id: true },
    });
    if (!existing) {
      throw { code: "PROJECT_DEADLINE_NOT_FOUND" as const, message: "This project has no deadline record to update." };
    }
  }

  if (hasInformationText) {
    await assertProjectMutableForWritesByProjectId(scope.id);
    const raw = body.informationText;
    if (raw !== null && raw !== undefined) {
      if (typeof raw !== "string") {
        throw { code: "INVALID_INFORMATION_TEXT" as const, message: "informationText must be a string or null" };
      }
      const trimmed = raw.trim();
      if (trimmed.length > MAX_INFORMATION_TEXT_LENGTH) {
        throw {
          code: "INVALID_INFORMATION_TEXT" as const,
          message: `informationText must be at most ${MAX_INFORMATION_TEXT_LENGTH} characters`,
        };
      }
    }
  }

  if (hasProjectStudentIds) {
    await assertProjectMutableForWritesByProjectId(scope.id);
    if (!Array.isArray(body.projectStudentIds)) {
      throw { code: "INVALID_PROJECT_STUDENTS" as const, message: "projectStudentIds must be an array" };
    }
  }

  return prisma.$transaction(async (tx) => {
    if (hasInformationText) {
      const raw = body.informationText;
      const normalized =
        raw === null || raw === undefined ? null : raw.trim().length === 0 ? null : (raw as string).trim();
      data.informationText = normalized;
    }

    if (Object.keys(data).length > 0) {
      await tx.project.update({
        where: { id: scope.id },
        data,
      });
    }

    if (hasDeadline && body.deadline) {
      await tx.projectDeadline.update({
        where: { projectId: scope.id },
        data: projectDeadlineUpdateData(body.deadline),
      });
    }

    if (hasProjectStudentIds) {
      const projectRow = await tx.project.findUnique({
        where: { id: scope.id },
        select: { moduleId: true, module: { select: { enterpriseId: true } } },
      });
      if (!projectRow) {
        throw { code: "PROJECT_NOT_FOUND" as const };
      }
      const allowedIds = await resolveAllowedProjectStudentIds(
        tx,
        projectRow.moduleId,
        projectRow.module.enterpriseId,
        body.projectStudentIds as number[],
      );
      await tx.projectStudent.deleteMany({ where: { projectId: scope.id } });
      if (allowedIds.length > 0) {
        await tx.projectStudent.createMany({
          data: allowedIds.map((userId) => ({ projectId: scope.id, userId })),
          skipDuplicates: true,
        });
      }
    }

    return tx.project.findUnique({
      where: { id: scope.id },
      select: MANAGE_SUMMARY_SELECT,
    });
  });
}

export async function deleteStaffProjectManage(actorUserId: number, projectId: number) {
  const scope = await getStaffProjectManageScope(actorUserId, projectId);
  const row = await prisma.project.findUnique({
    where: { id: scope.id },
    select: { moduleId: true },
  });
  if (!row) {
    throw { code: "PROJECT_NOT_FOUND" as const };
  }
  await prisma.project.delete({ where: { id: scope.id } });
  return { moduleId: row.moduleId };
}
