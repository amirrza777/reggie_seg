import { prisma } from "../../../shared/db.js";
import { assertProjectMutableForWritesByProjectId } from "../../../shared/projectWriteGuard.js";
import { getScopedStaffUser, isAdminScopedRole } from "../repo.staff-scope.js";
import type { StudentDeadlineOverrideInput } from "../repo.types.js";

type DeadlineScopeProject = {
  id: number;
  deadline: { id: number } | null;
};

type ScopedActor = NonNullable<Awaited<ReturnType<typeof getScopedStaffUser>>>;

async function findScopedProject(actor: ScopedActor, projectId: number): Promise<DeadlineScopeProject | null> {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: actor.enterpriseId,
      },
    },
    select: {
      id: true,
      deadline: {
        select: {
          id: true,
        },
      },
    },
  });
}

async function assertStaffProjectAccess(actor: ScopedActor, actorUserId: number, projectId: number): Promise<void> {
  if (isAdminScopedRole(actor.role)) {
    return;
  }

  const accessibleProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: actor.enterpriseId,
        OR: [
          { moduleLeads: { some: { userId: actorUserId } } },
          { moduleTeachingAssistants: { some: { userId: actorUserId } } },
        ],
      },
    },
    select: { id: true },
  });

  if (!accessibleProject) {
    throw { code: "FORBIDDEN", message: "You do not have staff access to this project" };
  }
}

async function getAccessibleProjectDeadlineScope(actorUserId: number, projectId: number): Promise<DeadlineScopeProject> {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const project = await findScopedProject(actor, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  await assertStaffProjectAccess(actor, actorUserId, projectId);
  return project;
}

type SerializableDeadlineOverride = {
  id: number;
  userId: number;
  taskOpenDate: string | null;
  taskDueDate: string | null;
  assessmentOpenDate: string | null;
  assessmentDueDate: string | null;
  feedbackOpenDate: string | null;
  feedbackDueDate: string | null;
  reason: string | null;
  updatedAt: string;
};

function isoOrNull(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString();
}

function serializeDeadlineOverride(override: {
  id: number;
  userId: number;
  taskOpenDate: Date | null;
  taskDueDate: Date | null;
  assessmentOpenDate: Date | null;
  assessmentDueDate: Date | null;
  feedbackOpenDate: Date | null;
  feedbackDueDate: Date | null;
  reason: string | null;
  updatedAt: Date;
}): SerializableDeadlineOverride {
  return {
    ...override,
    taskOpenDate: isoOrNull(override.taskOpenDate),
    taskDueDate: isoOrNull(override.taskDueDate),
    assessmentOpenDate: isoOrNull(override.assessmentOpenDate),
    assessmentDueDate: isoOrNull(override.assessmentDueDate),
    feedbackOpenDate: isoOrNull(override.feedbackOpenDate),
    feedbackDueDate: isoOrNull(override.feedbackDueDate),
    updatedAt: override.updatedAt.toISOString(),
  };
}

const STUDENT_DEADLINE_OVERRIDE_SELECT = {
  id: true,
  userId: true,
  taskOpenDate: true,
  taskDueDate: true,
  assessmentOpenDate: true,
  assessmentDueDate: true,
  feedbackOpenDate: true,
  feedbackDueDate: true,
  reason: true,
  updatedAt: true,
} as const;

export async function getStaffStudentDeadlineOverrides(actorUserId: number, projectId: number) {
  const project = await getAccessibleProjectDeadlineScope(actorUserId, projectId);
  if (!project.deadline) {
    return [];
  }

  const overrides = await prisma.studentDeadlineOverride.findMany({
    where: {
      projectDeadlineId: project.deadline.id,
    },
    select: STUDENT_DEADLINE_OVERRIDE_SELECT,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  return overrides.map(serializeDeadlineOverride);
}

async function ensureStudentInProject(projectId: number, studentId: number) {
  const allocation = await prisma.teamAllocation.findFirst({
    where: {
      userId: studentId,
      team: {
        projectId,
      },
    },
    select: { userId: true },
  });

  if (!allocation) {
    throw { code: "STUDENT_NOT_IN_PROJECT" };
  }
}

function deadlineOverrideUpdateData(payload: StudentDeadlineOverrideInput, actorUserId: number) {
  return {
    ...(payload.taskOpenDate !== undefined ? { taskOpenDate: payload.taskOpenDate } : {}),
    ...(payload.taskDueDate !== undefined ? { taskDueDate: payload.taskDueDate } : {}),
    ...(payload.assessmentOpenDate !== undefined ? { assessmentOpenDate: payload.assessmentOpenDate } : {}),
    ...(payload.assessmentDueDate !== undefined ? { assessmentDueDate: payload.assessmentDueDate } : {}),
    ...(payload.feedbackOpenDate !== undefined ? { feedbackOpenDate: payload.feedbackOpenDate } : {}),
    ...(payload.feedbackDueDate !== undefined ? { feedbackDueDate: payload.feedbackDueDate } : {}),
    reason: payload.reason ?? null,
    createdByUserId: actorUserId,
  };
}

function deadlineOverrideCreateData(
  payload: StudentDeadlineOverrideInput,
  actorUserId: number,
  studentId: number,
  projectDeadlineId: number,
) {
  return {
    userId: studentId,
    projectDeadlineId,
    createdByUserId: actorUserId,
    taskOpenDate: payload.taskOpenDate ?? null,
    taskDueDate: payload.taskDueDate ?? null,
    assessmentOpenDate: payload.assessmentOpenDate ?? null,
    assessmentDueDate: payload.assessmentDueDate ?? null,
    feedbackOpenDate: payload.feedbackOpenDate ?? null,
    feedbackDueDate: payload.feedbackDueDate ?? null,
    reason: payload.reason ?? null,
  };
}

async function getMutableProjectDeadlineScope(actorUserId: number, projectId: number): Promise<{ id: number; deadlineId: number }> {
  const project = await getAccessibleProjectDeadlineScope(actorUserId, projectId);
  await assertProjectMutableForWritesByProjectId(project.id);
  if (!project.deadline) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  return { id: project.id, deadlineId: project.deadline.id };
}

async function upsertStudentDeadlineOverride(
  actorUserId: number,
  studentId: number,
  deadlineId: number,
  payload: StudentDeadlineOverrideInput,
) {
  return prisma.studentDeadlineOverride.upsert({
    where: {
      userId_projectDeadlineId: {
        userId: studentId,
        projectDeadlineId: deadlineId,
      },
    },
    update: deadlineOverrideUpdateData(payload, actorUserId),
    create: deadlineOverrideCreateData(payload, actorUserId, studentId, deadlineId),
    select: STUDENT_DEADLINE_OVERRIDE_SELECT,
  });
}

export async function upsertStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
  payload: StudentDeadlineOverrideInput,
) {
  const scope = await getMutableProjectDeadlineScope(actorUserId, projectId);
  await ensureStudentInProject(projectId, studentId);

  const override = await upsertStudentDeadlineOverride(actorUserId, studentId, scope.deadlineId, payload);
  return serializeDeadlineOverride(override);
}

export async function clearStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
) {
  const scope = await getMutableProjectDeadlineScope(actorUserId, projectId);

  await prisma.studentDeadlineOverride.deleteMany({
    where: {
      userId: studentId,
      projectDeadlineId: scope.deadlineId,
    },
  });

  return { cleared: true };
}
