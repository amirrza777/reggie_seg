import { prisma } from "../../shared/db.js";
import {
  ensureCreatorLeader,
  replaceModuleAssignments,
  validateAssignmentUsers,
} from "./service.helpers.js";
import {
  canManageModuleAccess,
  mapModuleRecord,
  MODULE_SELECT,
} from "./service.core.js";
import type { EnterpriseUser, ParsedModulePayload } from "./types.js";

/** Creates a module. */
export async function createModule(enterpriseUser: EnterpriseUser, payload: ParsedModulePayload) {
  const leaderIds = ensureCreatorLeader(payload.leaderIds, enterpriseUser);
  const taIds = payload.taIds.filter((id) => !leaderIds.includes(id));

  const existing = await prisma.module.findFirst({
    where: { enterpriseId: enterpriseUser.enterpriseId, name: payload.name },
    select: { id: true },
  });
  if (existing) return { ok: false as const, status: 409, error: "Module name already exists" };

  const validation = await validateAssignmentUsers({
    enterpriseId: enterpriseUser.enterpriseId,
    leaderIds,
    taIds,
    studentIds: payload.studentIds,
  });
  if (!validation.ok) return { ok: false as const, status: 400, error: validation.error };

  const created = await prisma.$transaction(async (tx) => {
    const module = await tx.module.create({
      data: {
        enterpriseId: enterpriseUser.enterpriseId,
        name: payload.name,
        briefText: payload.briefText,
        timelineText: payload.timelineText,
        expectationsText: payload.expectationsText,
        readinessNotesText: payload.readinessNotesText,
      },
      select: { id: true },
    });

    await replaceModuleAssignments(tx, {
      enterpriseId: enterpriseUser.enterpriseId,
      moduleId: module.id,
      leaderIds,
      taIds,
      studentIds: payload.studentIds,
    });

    const withCounts = await tx.module.findUnique({ where: { id: module.id }, select: MODULE_SELECT });
    if (!withCounts) throw new Error("Failed to load created module");

    return withCounts;
  });

  return { ok: true as const, value: mapModuleRecord(created) };
}

/** Returns the module access. */
export async function getModuleAccess(enterpriseUser: EnterpriseUser, moduleId: number) {
  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: MODULE_SELECT,
  });
  if (!module) return { ok: false as const, status: 404, error: "Module not found" };

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  const [staffUsers, students] = await Promise.all([
    prisma.user.findMany({
      where: {
        enterpriseId: enterpriseUser.enterpriseId,
        role: { in: ["STAFF", "ENTERPRISE_ADMIN", "ADMIN"] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        moduleLeads: {
          where: { moduleId },
          select: { moduleId: true },
        },
        moduleTeachingAssistants: {
          where: { moduleId },
          select: { moduleId: true },
        },
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
    prisma.user.findMany({
      where: { enterpriseId: enterpriseUser.enterpriseId, role: "STUDENT" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        userModules: {
          where: { enterpriseId: enterpriseUser.enterpriseId, moduleId },
          select: { moduleId: true },
        },
        moduleTeachingAssistants: {
          where: { moduleId },
          select: { moduleId: true },
        },
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
  ]);

  return {
    ok: true as const,
    value: {
      module: mapModuleRecord(module),
      staff: staffUsers.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        active: user.active,
        isLeader: user.moduleLeads.length > 0,
        isTeachingAssistant: user.moduleTeachingAssistants.length > 0,
      })),
      students: students.map((student) => ({
        id: student.id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        active: student.active,
        enrolled: student.userModules.length > 0,
        isTeachingAssistant: student.moduleTeachingAssistants.length > 0,
      })),
    },
  };
}

/** Returns the module access selection. */
export async function getModuleAccessSelection(enterpriseUser: EnterpriseUser, moduleId: number) {
  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: MODULE_SELECT,
  });
  if (!module) return { ok: false as const, status: 404, error: "Module not found" };

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  const [leaders, teachingAssistants, students] = await Promise.all([
    prisma.moduleLead.findMany({
      where: { moduleId },
      select: { userId: true },
    }),
    prisma.moduleTeachingAssistant.findMany({
      where: { moduleId },
      select: { userId: true },
    }),
    prisma.userModule.findMany({
      where: { enterpriseId: enterpriseUser.enterpriseId, moduleId },
      select: { userId: true },
    }),
  ]);

  return {
    ok: true as const,
    value: {
      module: mapModuleRecord(module),
      leaderIds: leaders.map((item) => item.userId),
      taIds: teachingAssistants.map((item) => item.userId),
      studentIds: students.map((item) => item.userId),
    },
  };
}

/** Updates the module. */
export async function updateModule(enterpriseUser: EnterpriseUser, moduleId: number, payload: ParsedModulePayload) {
  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  if (payload.leaderIds.length === 0) {
    return { ok: false as const, status: 400, error: "At least one module leader is required" };
  }

  const taIds = payload.taIds.filter((id) => !payload.leaderIds.includes(id));

  const existing = await prisma.module.findFirst({
    where: {
      enterpriseId: enterpriseUser.enterpriseId,
      name: payload.name,
      id: { not: moduleId },
    },
    select: { id: true },
  });
  if (existing) return { ok: false as const, status: 409, error: "Module name already exists" };

  const validation = await validateAssignmentUsers({
    enterpriseId: enterpriseUser.enterpriseId,
    leaderIds: payload.leaderIds,
    taIds,
    studentIds: payload.studentIds,
  });
  if (!validation.ok) return { ok: false as const, status: 400, error: validation.error };

  const updated = await prisma.$transaction(async (tx) => {
    const module = await tx.module.findFirst({
      where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
      select: { id: true },
    });
    if (!module) return null;

    await tx.module.update({
      where: { id: moduleId },
      data: {
        name: payload.name,
        briefText: payload.briefText,
        timelineText: payload.timelineText,
        expectationsText: payload.expectationsText,
        readinessNotesText: payload.readinessNotesText,
      },
      select: { id: true },
    });

    await replaceModuleAssignments(tx, {
      enterpriseId: enterpriseUser.enterpriseId,
      moduleId,
      leaderIds: payload.leaderIds,
      taIds,
      studentIds: payload.studentIds,
    });

    return tx.module.findUnique({ where: { id: moduleId }, select: MODULE_SELECT });
  });

  if (!updated) return { ok: false as const, status: 404, error: "Module not found" };
  return { ok: true as const, value: mapModuleRecord(updated) };
}

/** Deletes the module. */
export async function deleteModule(enterpriseUser: EnterpriseUser, moduleId: number) {
  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  const deleted = await prisma.$transaction(async (tx) => {
    const module = await tx.module.findFirst({
      where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
      select: { id: true },
    });
    if (!module) return false;

    await tx.moduleLead.deleteMany({ where: { moduleId } });
    await tx.moduleTeachingAssistant.deleteMany({ where: { moduleId } });
    await tx.userModule.deleteMany({ where: { enterpriseId: enterpriseUser.enterpriseId, moduleId } });
    await tx.module.delete({ where: { id: moduleId }, select: { id: true } });
    return true;
  });

  if (!deleted) return { ok: false as const, status: 404, error: "Module not found" };
  return { ok: true as const, value: { moduleId, deleted: true as const } };
}

/** Returns the module students. */
export async function getModuleStudents(enterpriseUser: EnterpriseUser, moduleId: number) {
  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: MODULE_SELECT,
  });
  if (!module) return { ok: false as const, status: 404, error: "Module not found" };

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  const students = await prisma.user.findMany({
    where: { enterpriseId: enterpriseUser.enterpriseId, role: "STUDENT" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      active: true,
      userModules: {
        where: { enterpriseId: enterpriseUser.enterpriseId, moduleId },
        select: { moduleId: true },
      },
    },
    orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
  });

  return {
    ok: true as const,
    value: {
      module: mapModuleRecord(module),
      students: students.map((student) => ({
        id: student.id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        active: student.active,
        enrolled: student.userModules.length > 0,
      })),
    },
  };
}

/** Updates the module students. */
export async function updateModuleStudents(enterpriseUser: EnterpriseUser, moduleId: number, studentIds: number[]) {
  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: { id: true },
  });
  if (!module) return { ok: false as const, status: 404, error: "Module not found" };

  const validation = await validateAssignmentUsers({
    enterpriseId: enterpriseUser.enterpriseId,
    leaderIds: [],
    taIds: [],
    studentIds,
  });
  if (!validation.ok) return { ok: false as const, status: 400, error: validation.error };

  await prisma.$transaction(async (tx) => {
    await tx.userModule.deleteMany({ where: { enterpriseId: enterpriseUser.enterpriseId, moduleId } });

    if (studentIds.length > 0) {
      await tx.userModule.createMany({
        data: studentIds.map((studentId) => ({ enterpriseId: enterpriseUser.enterpriseId, moduleId, userId: studentId })),
      });
    }
  });

  return {
    ok: true as const,
    value: {
      moduleId,
      studentIds,
      studentCount: studentIds.length,
    },
  };
}
