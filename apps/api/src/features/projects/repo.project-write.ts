import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { getScopedStaffUser, isAdminScopedRole } from "./repo.staff-scope.js";
import type { ProjectDeadlineInput } from "./repo.types.js";

type CreateProjectArgs = {
  actorUserId: number;
  name: string;
  moduleId: number;
  questionnaireTemplateId: number;
  teamAllocationQuestionnaireTemplateId: number | undefined;
  informationText: string | null;
  deadline: ProjectDeadlineInput;
  studentIds?: number[];
};

type CreateProjectValidatedContext = {
  actor: NonNullable<Awaited<ReturnType<typeof getScopedStaffUser>>>;
  validatedTeamAllocationTemplateId: number | null;
  normalizedStudentIds: number[];
};

const CREATED_PROJECT_SELECT = {
  id: true,
  name: true,
  informationText: true,
  moduleId: true,
  questionnaireTemplateId: true,
  teamAllocationQuestionnaireTemplateId: true,
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
    },
  },
} as const;

async function assertModuleExistsForActor(
  actor: { enterpriseId: string },
  moduleId: number,
): Promise<{ id: number; archivedAt: Date | null }> {
  const moduleRecord = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: actor.enterpriseId },
    select: { id: true, archivedAt: true },
  });

  if (!moduleRecord) {
    throw { code: "MODULE_NOT_FOUND" };
  }
  if (moduleRecord.archivedAt != null) {
    throw { code: "MODULE_ARCHIVED" };
  }
  return moduleRecord;
}

async function assertCanCreateProjectInModule(
  actor: { id: number; role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN"; enterpriseId: string },
  moduleId: number,
): Promise<void> {
  if (isAdminScopedRole(actor.role)) {
    return;
  }

  const staffModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      enterpriseId: actor.enterpriseId,
      OR: [
        { moduleLeads: { some: { userId: actor.id } } },
        { moduleTeachingAssistants: { some: { userId: actor.id } } },
      ],
    },
    select: { id: true },
  });

  if (!staffModule) {
    throw { code: "FORBIDDEN", message: "You do not have access to create projects in this module" };
  }
}

async function assertTemplatePurpose(templateId: number, purpose: "PEER_ASSESSMENT" | "CUSTOMISED_ALLOCATION") {
  const template = await prisma.questionnaireTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, purpose: true },
  });

  if (!template) {
    throw {
      code: purpose === "PEER_ASSESSMENT" ? "TEMPLATE_NOT_FOUND" : "TEAM_ALLOCATION_TEMPLATE_NOT_FOUND",
    };
  }

  if (template.purpose !== purpose) {
    throw {
      code: purpose === "PEER_ASSESSMENT" ? "TEMPLATE_INVALID_PURPOSE" : "TEAM_ALLOCATION_TEMPLATE_INVALID_PURPOSE",
    };
  }

  return template.id;
}

function normalizeStudentIds(studentIds?: number[]): number[] {
  if (!Array.isArray(studentIds)) {
    return [];
  }

  const normalizedStudentIds = Array.from(new Set(studentIds));
  if (normalizedStudentIds.length !== studentIds.length) {
    throw { code: "INVALID_STUDENT_IDS" };
  }

  return normalizedStudentIds;
}

async function assertStudentsBelongToModule(studentIds: number[], enterpriseId: string, moduleId: number): Promise<void> {
  if (studentIds.length === 0) {
    return;
  }

  const moduleStudents = await prisma.user.findMany({
    where: {
      id: { in: studentIds },
      enterpriseId,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
    },
    select: { id: true },
  });

  if (moduleStudents.length !== studentIds.length) {
    throw { code: "STUDENTS_NOT_IN_MODULE" };
  }
}

function projectDeadlineCreateInput(deadline: ProjectDeadlineInput) {
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
  };
}

async function validateCreateProjectContext(args: CreateProjectArgs): Promise<CreateProjectValidatedContext> {
  const actor = await getScopedStaffUser(args.actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  await assertModuleExistsForActor(actor, args.moduleId);
  await assertCanCreateProjectInModule(actor, args.moduleId);
  await assertTemplatePurpose(args.questionnaireTemplateId, "PEER_ASSESSMENT");

  const validatedTeamAllocationTemplateId =
    args.teamAllocationQuestionnaireTemplateId === undefined
      ? null
      : await assertTemplatePurpose(args.teamAllocationQuestionnaireTemplateId, "CUSTOMISED_ALLOCATION");

  const normalizedStudentIds = normalizeStudentIds(args.studentIds);
  await assertStudentsBelongToModule(normalizedStudentIds, actor.enterpriseId, args.moduleId);

  return { actor, validatedTeamAllocationTemplateId, normalizedStudentIds };
}

async function createProjectRecord(
  tx: Prisma.TransactionClient,
  args: CreateProjectArgs,
  validatedTeamAllocationTemplateId: number | null,
) {
  return tx.project.create({
    data: {
      name: args.name,
      informationText: args.informationText,
      moduleId: args.moduleId,
      questionnaireTemplateId: args.questionnaireTemplateId,
      teamAllocationQuestionnaireTemplateId: validatedTeamAllocationTemplateId,
      deadline: {
        create: projectDeadlineCreateInput(args.deadline),
      },
    },
    select: CREATED_PROJECT_SELECT,
  });
}

async function linkProjectStudents(tx: Prisma.TransactionClient, projectId: number, studentIds: number[]) {
  if (studentIds.length === 0) {
    return;
  }

  await tx.projectStudent.createMany({
    data: studentIds.map((userId) => ({ projectId, userId })),
    skipDuplicates: true,
  });
}

async function runCreateProjectTransaction(args: CreateProjectArgs, context: CreateProjectValidatedContext) {
  return prisma.$transaction(async (tx) => {
    const createdProject = await createProjectRecord(tx, args, context.validatedTeamAllocationTemplateId);
    await linkProjectStudents(tx, createdProject.id, context.normalizedStudentIds);
    return createdProject;
  });
}

// eslint-disable-next-line max-params
export async function createProject(
  actorUserId: number,
  name: string,
  moduleId: number,
  questionnaireTemplateId: number,
  teamAllocationQuestionnaireTemplateId: number | undefined,
  informationText: string | null,
  deadline: ProjectDeadlineInput,
  studentIds?: number[],
) {
  const args: CreateProjectArgs = {
    actorUserId,
    name,
    moduleId,
    questionnaireTemplateId,
    teamAllocationQuestionnaireTemplateId,
    informationText,
    deadline,
    studentIds,
  };

  const context = await validateCreateProjectContext(args);
  return runCreateProjectTransaction(args, context);
}
