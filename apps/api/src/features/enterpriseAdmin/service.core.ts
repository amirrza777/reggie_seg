import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { isEnterpriseAdminRole } from "./service.helpers.js";
import type { AssignableUser, EnterpriseUser } from "./types.js";

export const MODULE_SELECT = {
  id: true,
  code: true,
  name: true,
  briefText: true,
  timelineText: true,
  expectationsText: true,
  readinessNotesText: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      userModules: true,
      moduleLeads: true,
      moduleTeachingAssistants: true,
    },
  },
} satisfies Prisma.ModuleSelect;

export function buildModuleScopeWhere(enterpriseUser: EnterpriseUser): Prisma.ModuleWhereInput {
  return {
    enterpriseId: enterpriseUser.enterpriseId,
    ...(isEnterpriseAdminRole(enterpriseUser.role)
      ? {}
      : {
          OR: [
            { moduleLeads: { some: { userId: enterpriseUser.id } } },
            { moduleTeachingAssistants: { some: { userId: enterpriseUser.id } } },
          ],
        }),
  };
}

export function buildManagedModuleSelect(enterpriseUser: EnterpriseUser) {
  return {
    ...MODULE_SELECT,
    moduleLeads: {
      where: { userId: enterpriseUser.id },
      select: { userId: true },
    },
  };
}

export function mapModuleRecord(module: Prisma.ModuleGetPayload<{ select: typeof MODULE_SELECT }>) {
  return {
    id: module.id,
    code: module.code ?? undefined,
    name: module.name,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
    archivedAt: module.archivedAt?.toISOString() ?? null,
    briefText: module.briefText ?? undefined,
    timelineText: module.timelineText ?? undefined,
    expectationsText: module.expectationsText ?? undefined,
    readinessNotesText: module.readinessNotesText ?? undefined,
    studentCount: module._count.userModules,
    leaderCount: module._count.moduleLeads,
    teachingAssistantCount: module._count.moduleTeachingAssistants,
  };
}

export function toEnterpriseModuleSearchResponse(
  items: Array<ReturnType<typeof mapModuleRecord> & { canManageAccess: boolean }>,
  filters: { query: string | null; page: number; pageSize: number },
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
  };
}

export function toEnterpriseAccessUserSearchResponse(
  items: AssignableUser[],
  filters: {
    scope: "staff" | "students" | "staff_and_students" | "all";
    query: string | null;
    page: number;
    pageSize: number;
  },
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
    scope: filters.scope,
  };
}

/** Checks whether manage module access. */
export async function canManageModuleAccess(user: EnterpriseUser, moduleId: number): Promise<boolean> {
  if (isEnterpriseAdminRole(user.role)) {
    return true;
  }

  const membership = await prisma.moduleLead.findFirst({
    where: {
      moduleId,
      userId: user.id,
      module: { enterpriseId: user.enterpriseId },
    },
    select: { moduleId: true },
  });

  return Boolean(membership);
}
