import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { generateModuleJoinCode } from "../services/moduleJoinCodeService.js";
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

const MODULE_WITH_JOIN_CODE_SELECT = {
  ...MODULE_SELECT,
  joinCode: true,
} satisfies Prisma.ModuleSelect;

const MODULE_JOIN_CODE_CREATE_MAX_ATTEMPTS = 5;

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

  for (let attempt = 0; attempt < MODULE_JOIN_CODE_CREATE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const joinCode = await generateModuleJoinCode(tx, enterpriseUser.enterpriseId);
        const module = await tx.module.create({
          data: {
            enterpriseId: enterpriseUser.enterpriseId,
            joinCode,
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

        const withCounts = await tx.module.findUnique({
          where: { id: module.id },
          select: MODULE_WITH_JOIN_CODE_SELECT,
        });
        if (!withCounts) throw new Error("Failed to load created module");

        return withCounts;
      });

      return {
        ok: true as const,
        value: {
          ...mapModuleRecord(created),
          joinCode: created.joinCode,
        },
      };
    } catch (error) {
      if (isModuleJoinCodeUniqueConstraintError(error) && attempt < MODULE_JOIN_CODE_CREATE_MAX_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to create module join code");
}

/** Returns the module access. */
export async function getModuleAccess(enterpriseUser: EnterpriseUser, moduleId: number) {
  const module = await findManagedModule(enterpriseUser.enterpriseId, moduleId);
  if (!module) return { ok: false as const, status: 404, error: "Module not found" };

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  const { staffUsers, students } = await loadModuleAccessUsers(enterpriseUser.enterpriseId, moduleId);

  return {
    ok: true as const,
    value: {
      module: mapModuleRecord(module),
      staff: staffUsers.map(mapStaffAccessUser),
      students: students.map(mapStudentAccessUser),
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

export async function getModuleJoinCode(enterpriseUser: EnterpriseUser, moduleId: number) {
  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: { id: true, joinCode: true },
  });
  if (!module) return { ok: false as const, status: 404, error: "Module not found" };

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  return {
    ok: true as const,
    value: {
      moduleId: module.id,
      joinCode: module.joinCode,
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

  const taIds = removeLeaderIds(payload.taIds, payload.leaderIds);

  const nameExists = await moduleNameExists(enterpriseUser.enterpriseId, payload.name, moduleId);
  if (nameExists) return { ok: false as const, status: 409, error: "Module name already exists" };

  const validation = await validateAssignmentUsers({
    enterpriseId: enterpriseUser.enterpriseId,
    leaderIds: payload.leaderIds,
    taIds,
    studentIds: payload.studentIds,
  });
  if (!validation.ok) return { ok: false as const, status: 400, error: validation.error };

  const updated = await updateModuleRecord({
    enterpriseId: enterpriseUser.enterpriseId,
    moduleId,
    payload,
    taIds,
  });

  if (!updated) return { ok: false as const, status: 404, error: "Module not found" };
  return { ok: true as const, value: mapModuleRecord(updated) };
}

async function findManagedModule(enterpriseId: string, moduleId: number) {
  return prisma.module.findFirst({
    where: { id: moduleId, enterpriseId },
    select: MODULE_SELECT,
  });
}

async function loadModuleAccessUsers(enterpriseId: string, moduleId: number) {
  const [staffUsers, students] = await Promise.all([
    prisma.user.findMany({
      where: {
        enterpriseId,
        role: { in: ["STAFF", "ENTERPRISE_ADMIN", "ADMIN"] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        moduleLeads: { where: { moduleId }, select: { moduleId: true } },
        moduleTeachingAssistants: { where: { moduleId }, select: { moduleId: true } },
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
    prisma.user.findMany({
      where: { enterpriseId, role: "STUDENT" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        userModules: { where: { enterpriseId, moduleId }, select: { moduleId: true } },
        moduleTeachingAssistants: { where: { moduleId }, select: { moduleId: true } },
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
  ]);

  return { staffUsers, students };
}

function mapStaffAccessUser(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  moduleLeads: { moduleId: number }[];
  moduleTeachingAssistants: { moduleId: number }[];
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    active: user.active,
    isLeader: user.moduleLeads.length > 0,
    isTeachingAssistant: user.moduleTeachingAssistants.length > 0,
  };
}

function mapStudentAccessUser(student: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  userModules: { moduleId: number }[];
  moduleTeachingAssistants: { moduleId: number }[];
}) {
  return {
    id: student.id,
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
    active: student.active,
    enrolled: student.userModules.length > 0,
    isTeachingAssistant: student.moduleTeachingAssistants.length > 0,
  };
}

function removeLeaderIds(taIds: number[], leaderIds: number[]) {
  return taIds.filter((id) => !leaderIds.includes(id));
}

async function moduleNameExists(enterpriseId: string, moduleName: string, excludeModuleId: number) {
  const existing = await prisma.module.findFirst({
    where: {
      enterpriseId,
      name: moduleName,
      id: { not: excludeModuleId },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function updateModuleRecord(params: {
  enterpriseId: string;
  moduleId: number;
  payload: ParsedModulePayload;
  taIds: number[];
}) {
  return prisma.$transaction(async (tx) => {
    const module = await tx.module.findFirst({
      where: { id: params.moduleId, enterpriseId: params.enterpriseId },
      select: { id: true },
    });
    if (!module) return null;

    await tx.module.update({
      where: { id: params.moduleId },
      data: {
        name: params.payload.name,
        briefText: params.payload.briefText,
        timelineText: params.payload.timelineText,
        expectationsText: params.payload.expectationsText,
        readinessNotesText: params.payload.readinessNotesText,
      },
      select: { id: true },
    });

    await replaceModuleAssignments(tx, {
      enterpriseId: params.enterpriseId,
      moduleId: params.moduleId,
      leaderIds: params.payload.leaderIds,
      taIds: params.taIds,
      studentIds: params.payload.studentIds,
    });

    return tx.module.findUnique({ where: { id: params.moduleId }, select: MODULE_SELECT });
  });
}

function isModuleJoinCodeUniqueConstraintError(error: unknown) {
  const prismaError = error as { code?: unknown; meta?: { target?: unknown } } | null;
  if (prismaError?.code !== "P2002") {
    return false;
  }

  const target = prismaError.meta?.target;
  if (!Array.isArray(target)) {
    return false;
  }

  return target.includes("enterpriseId") && target.includes("joinCode");
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
