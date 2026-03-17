import { prisma } from "../../shared/db.js";
import {
  buildEnterpriseAccessUserSearchWhere,
  parseEnterpriseAccessUserSearchFilters,
} from "./accessUserSearch.js";
import { buildEnterpriseModuleSearchWhere, parseEnterpriseModuleSearchFilters } from "./moduleSearch.js";
import {
  getUtcStartOfDaysAgo,
  isEnterpriseAdminRole,
  normalizeFeatureFlagLabel,
} from "./service.helpers.js";
import {
  buildManagedModuleSelect,
  buildModuleScopeWhere,
  mapModuleRecord,
  toEnterpriseAccessUserSearchResponse,
  toEnterpriseModuleSearchResponse,
} from "./service.core.js";
import type { EnterpriseUser } from "./types.js";

/** Returns the overview. */
export function getOverview(enterpriseUser: EnterpriseUser) {
  return buildOverview(enterpriseUser);
}

/** Returns enterprise feature flags for admin roles. */
export async function listFeatureFlags(enterpriseUser: EnterpriseUser) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const flags = await prisma.featureFlag.findMany({
    where: { enterpriseId: enterpriseUser.enterpriseId },
    orderBy: { key: "asc" },
  });
  return { ok: true as const, value: flags.map(normalizeFeatureFlagLabel) };
}

/** Updates an enterprise feature flag for admin roles. */
export async function updateFeatureFlag(enterpriseUser: EnterpriseUser, key: string, enabled: boolean) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  try {
    const updated = await prisma.featureFlag.update({
      where: { enterpriseId_key: { enterpriseId: enterpriseUser.enterpriseId, key } },
      data: { enabled },
    });
    return { ok: true as const, value: normalizeFeatureFlagLabel(updated) };
  } catch (err: any) {
    if (err.code === "P2025") return { ok: false as const, status: 404, error: "Feature flag not found" };
    throw err;
  }
}

/** Returns the modules. */
export async function listModules(enterpriseUser: EnterpriseUser) {
  const modules = await prisma.module.findMany({
    where: buildModuleScopeWhere(enterpriseUser),
    select: buildManagedModuleSelect(enterpriseUser),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return modules.map((module) => ({
    ...mapModuleRecord(module),
    canManageAccess: isEnterpriseAdminRole(enterpriseUser.role) || module.moduleLeads.length > 0,
  }));
}

/** Parses the module search filters. */
export function parseModuleSearchFilters(query: unknown) {
  return parseEnterpriseModuleSearchFilters(query);
}

/** Executes the search modules. */
export async function searchModules(
  enterpriseUser: EnterpriseUser,
  filters: { query: string | null; page: number; pageSize: number },
) {
  const where = buildEnterpriseModuleSearchWhere(buildModuleScopeWhere(enterpriseUser), filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const [total, modules] = await prisma.$transaction([
    prisma.module.count({ where }),
    prisma.module.findMany({
      where,
      select: buildManagedModuleSelect(enterpriseUser),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: filters.pageSize,
    }),
  ]);

  return toEnterpriseModuleSearchResponse(
    modules.map((module) => ({
      ...mapModuleRecord(module),
      canManageAccess: isEnterpriseAdminRole(enterpriseUser.role) || module.moduleLeads.length > 0,
    })),
    filters,
    total,
  );
}

/** Returns the assignable users. */
export async function listAssignableUsers(enterpriseUser: EnterpriseUser) {
  const [staff, students] = await Promise.all([
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
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        enterpriseId: enterpriseUser.enterpriseId,
        role: "STUDENT",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
  ]);

  return { staff, students };
}

/** Parses the access user search filters. */
export function parseAccessUserSearchFilters(query: unknown) {
  return parseEnterpriseAccessUserSearchFilters(query);
}

/** Executes the search assignable users. */
export async function searchAssignableUsers(
  enterpriseUser: EnterpriseUser,
  filters: { scope: "staff" | "students" | "all"; query: string | null; page: number; pageSize: number },
) {
  const where = buildEnterpriseAccessUserSearchWhere(enterpriseUser.enterpriseId, filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
      skip: offset,
      take: filters.pageSize,
    }),
  ]);

  return toEnterpriseAccessUserSearchResponse(users, filters, total);
}

async function buildOverview(enterpriseUser: EnterpriseUser) {
  const thirtyDaysAgo = getUtcStartOfDaysAgo(30);

  const [
    users,
    activeUsers,
    students,
    staff,
    enterpriseAdmins,
    modules,
    teams,
    meetings,
    inactiveUsers,
    studentsWithoutModule,
    modulesWithoutStudents,
    newUsers30d,
    newModules30d,
  ] = await Promise.all([
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, active: true } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, role: "STUDENT" } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, role: "STAFF" } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, role: "ENTERPRISE_ADMIN" } }),
    prisma.module.count({ where: { enterpriseId: enterpriseUser.enterpriseId } }),
    prisma.team.count({ where: { enterpriseId: enterpriseUser.enterpriseId } }),
    prisma.meeting.count({ where: { team: { enterpriseId: enterpriseUser.enterpriseId } } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, active: false } }),
    prisma.user.count({
      where: {
        enterpriseId: enterpriseUser.enterpriseId,
        role: "STUDENT",
        userModules: { none: {} },
      },
    }),
    prisma.module.count({ where: { enterpriseId: enterpriseUser.enterpriseId, userModules: { none: {} } } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.module.count({ where: { enterpriseId: enterpriseUser.enterpriseId, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  return {
    totals: {
      users,
      activeUsers,
      students,
      staff,
      enterpriseAdmins,
      modules,
      teams,
      meetings,
    },
    hygiene: {
      inactiveUsers,
      studentsWithoutModule,
      modulesWithoutStudents,
    },
    trends: {
      newUsers30d,
      newModules30d,
    },
  };
}
