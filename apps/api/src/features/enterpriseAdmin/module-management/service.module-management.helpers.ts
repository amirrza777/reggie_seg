import { prisma } from "../../shared/db.js";
import { replaceModuleAssignments } from "./service.helpers.js";
import { MODULE_SELECT } from "./service.shared.js";
import type { ParsedModulePayload } from "./types.js";
import type { Prisma } from "@prisma/client";

const accessUsersOrderBy = [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }] as const;

function buildStaffAccessUsersQuery(enterpriseId: string, moduleId: number) {
  return {
    where: {
      enterpriseId,
      role: { in: ["STAFF", "ENTERPRISE_ADMIN"] },
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
    orderBy: accessUsersOrderBy,
  };
}

function buildStudentAccessUsersQuery(enterpriseId: string, moduleId: number) {
  return {
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
    orderBy: accessUsersOrderBy,
  };
}

async function findManagedModuleId(tx: Prisma.TransactionClient, enterpriseId: string, moduleId: number) {
  return tx.module.findFirst({ where: { id: moduleId, enterpriseId }, select: { id: true } });
}

async function updateModuleDetails(
  tx: Prisma.TransactionClient,
  moduleId: number,
  payload: ParsedModulePayload,
) {
  await tx.module.update({
    where: { id: moduleId },
    data: {
      code: payload.code,
      name: payload.name,
      briefText: payload.briefText,
      timelineText: payload.timelineText,
      expectationsText: payload.expectationsText,
      readinessNotesText: payload.readinessNotesText,
    },
    select: { id: true },
  });
}

export async function findManagedModule(enterpriseId: string, moduleId: number) {
  return prisma.module.findFirst({
    where: { id: moduleId, enterpriseId },
    select: MODULE_SELECT,
  });
}

export async function loadModuleAccessUsers(enterpriseId: string, moduleId: number) {
  const [staffUsers, students] = await Promise.all([
    prisma.user.findMany(buildStaffAccessUsersQuery(enterpriseId, moduleId)),
    prisma.user.findMany(buildStudentAccessUsersQuery(enterpriseId, moduleId)),
  ]);
  return { staffUsers, students };
}

export function mapStaffAccessUser(user: {
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

export function mapStudentAccessUser(student: {
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

export function uniqueUserIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

export async function moduleNameExists(enterpriseId: string, moduleName: string, excludeModuleId: number) {
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

export async function moduleCodeExists(enterpriseId: string, moduleCode: string | null, excludeModuleId?: number) {
  if (!moduleCode) {
    return false;
  }

  const existing = await prisma.module.findFirst({
    where: {
      enterpriseId,
      code: moduleCode,
      ...(excludeModuleId ? { id: { not: excludeModuleId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function updateModuleRecord(params: {
  enterpriseId: string;
  moduleId: number;
  payload: ParsedModulePayload;
  taIds: number[];
}) {
  return prisma.$transaction(async (tx) => {
    const module = await findManagedModuleId(tx, params.enterpriseId, params.moduleId);
    if (!module) {
      return null;
    }

    await updateModuleDetails(tx, params.moduleId, params.payload);
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
