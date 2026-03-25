import { prisma } from "../../shared/db.js";
import type { ParsedQs } from "qs";
import {
  DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES,
  fuzzyFilterAndPaginate,
  shouldUseFuzzyFallback,
} from "../../shared/fuzzyFallback.js";
import {
  buildEnterpriseAccessUserSearchWhere,
  matchesEnterpriseAccessUserSearchCandidate,
  parseEnterpriseAccessUserSearchFilters,
  type EnterpriseAccessUserSearchFilters,
} from "./accessUserSearch.js";
import {
  buildEnterpriseModuleSearchWhere,
  matchesEnterpriseModuleSearchCandidate,
  parseEnterpriseModuleSearchFilters,
} from "./moduleSearch.js";
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
  return parseEnterpriseModuleSearchFilters(query as ParsedQs);
}

/** Executes the search modules. */
export async function searchModules(
  enterpriseUser: EnterpriseUser,
  filters: { query: string | null; page: number; pageSize: number },
) {
  const baseWhere = buildModuleScopeWhere(enterpriseUser);
  const strictResponse = await runStrictModuleSearch(enterpriseUser, filters, baseWhere);
  if (!shouldUseFuzzyFallback(strictResponse.total, filters.query)) return strictResponse;
  return runFuzzyModuleSearch(enterpriseUser, filters, baseWhere, strictResponse);
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
  return parseEnterpriseAccessUserSearchFilters(query as ParsedQs);
}

/** Executes the search assignable users. */
export async function searchAssignableUsers(enterpriseUser: EnterpriseUser, filters: EnterpriseAccessUserSearchFilters) {
  let excludeEnrolledInModuleId = filters.excludeEnrolledInModuleId;
  if (excludeEnrolledInModuleId != null) {
    const mod = await prisma.module.findFirst({
      where: { id: excludeEnrolledInModuleId, enterpriseId: enterpriseUser.enterpriseId },
      select: { id: true },
    });
    if (!mod) excludeEnrolledInModuleId = undefined;
  }

  const strictResponse = await runStrictAssignableUserSearch(
    enterpriseUser.enterpriseId,
    filters,
    excludeEnrolledInModuleId,
  );
  if (!shouldUseFuzzyFallback(strictResponse.total, filters.query)) return strictResponse;
  return runFuzzyAssignableUserSearch(
    enterpriseUser.enterpriseId,
    filters,
    strictResponse,
    excludeEnrolledInModuleId,
  );
}

async function buildOverview(enterpriseUser: EnterpriseUser) {
  const thirtyDaysAgo = getUtcStartOfDaysAgo(30);
  const counts = await loadOverviewCounts(enterpriseUser.enterpriseId, thirtyDaysAgo);

  return {
    totals: {
      users: counts.users,
      activeUsers: counts.activeUsers,
      students: counts.students,
      staff: counts.staff,
      enterpriseAdmins: counts.enterpriseAdmins,
      modules: counts.modules,
      teams: counts.teams,
      meetings: counts.meetings,
    },
    hygiene: {
      inactiveUsers: counts.inactiveUsers,
      studentsWithoutModule: counts.studentsWithoutModule,
      modulesWithoutStudents: counts.modulesWithoutStudents,
    },
    trends: {
      newUsers30d: counts.newUsers30d,
      newModules30d: counts.newModules30d,
    },
  };
}

async function runStrictModuleSearch(
  enterpriseUser: EnterpriseUser,
  filters: { query: string | null; page: number; pageSize: number },
  baseWhere: ReturnType<typeof buildModuleScopeWhere>
) {
  const where = buildEnterpriseModuleSearchWhere(baseWhere, filters);
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

  const mappedModules = modules.map((module) => mapManagedModule(module, enterpriseUser.role));
  return toEnterpriseModuleSearchResponse(mappedModules, filters, total);
}

async function runFuzzyModuleSearch(
  enterpriseUser: EnterpriseUser,
  filters: { query: string | null; page: number; pageSize: number },
  baseWhere: ReturnType<typeof buildModuleScopeWhere>,
  strictResponse: ReturnType<typeof toEnterpriseModuleSearchResponse>
) {
  const candidateTotal = await prisma.module.count({ where: baseWhere });
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) return strictResponse;

  const fuzzyCandidates = await prisma.module.findMany({
    where: baseWhere,
    select: { id: true, name: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const fuzzyPage = fuzzyFilterAndPaginate(fuzzyCandidates, {
    query: filters.query ?? "",
    pagination: filters,
    matches: matchesEnterpriseModuleSearchCandidate,
  });
  if (fuzzyPage.total === 0) return toEnterpriseModuleSearchResponse([], filters, 0);

  const orderedPageItems = await loadOrderedFuzzyModulePageItems(enterpriseUser, fuzzyPage.items.map((item) => item.id));
  return toEnterpriseModuleSearchResponse(
    orderedPageItems.map((module) => mapManagedModule(module, enterpriseUser.role)),
    filters,
    fuzzyPage.total
  );
}

async function loadOrderedFuzzyModulePageItems(enterpriseUser: EnterpriseUser, pageIds: number[]) {
  const fuzzyModules = await prisma.module.findMany({
    where: { id: { in: pageIds } },
    select: buildManagedModuleSelect(enterpriseUser),
  });
  const fuzzyModulesById = new Map(fuzzyModules.map((module) => [module.id, module]));
  return pageIds
    .map((id) => fuzzyModulesById.get(id))
    .filter((module): module is (typeof fuzzyModules)[number] => Boolean(module));
}

function mapManagedModule(
  module: Parameters<typeof mapModuleRecord>[0] & { moduleLeads: Array<{ userId: number }> },
  role: EnterpriseUser["role"]
) {
  return {
    ...mapModuleRecord(module),
    canManageAccess: isEnterpriseAdminRole(role) || module.moduleLeads.length > 0,
  };
}

async function runStrictAssignableUserSearch(
  enterpriseId: string,
  filters: Pick<EnterpriseAccessUserSearchFilters, "scope" | "query" | "page" | "pageSize">,
  excludeEnrolledInModuleId?: number,
) {
  const where = buildEnterpriseAccessUserSearchWhere(
    enterpriseId,
    filters,
    excludeEnrolledInModuleId === undefined ? undefined : { excludeEnrolledInModuleId },
  );
  const offset = (filters.page - 1) * filters.pageSize;
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, active: true },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
      skip: offset,
      take: filters.pageSize,
    }),
  ]);
  return toEnterpriseAccessUserSearchResponse(users, filters, total);
}

async function runFuzzyAssignableUserSearch(
  enterpriseId: string,
  filters: Pick<EnterpriseAccessUserSearchFilters, "scope" | "query" | "page" | "pageSize">,
  strictResponse: ReturnType<typeof toEnterpriseAccessUserSearchResponse>,
  excludeEnrolledInModuleId?: number,
) {
  const fuzzyBaseWhere = buildEnterpriseAccessUserSearchWhere(
    enterpriseId,
    { scope: filters.scope, query: null },
    excludeEnrolledInModuleId === undefined ? undefined : { excludeEnrolledInModuleId },
  );
  const candidateTotal = await prisma.user.count({ where: fuzzyBaseWhere });
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) return strictResponse;

  const candidates = await prisma.user.findMany({
    where: fuzzyBaseWhere,
    select: { id: true, email: true, firstName: true, lastName: true, active: true },
    orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    take: candidateTotal,
  });
  const fuzzyPage = fuzzyFilterAndPaginate(candidates, {
    query: filters.query ?? "",
    pagination: filters,
    matches: matchesEnterpriseAccessUserSearchCandidate,
  });
  return toEnterpriseAccessUserSearchResponse(fuzzyPage.items, filters, fuzzyPage.total);
}

async function loadOverviewCounts(enterpriseId: string, thirtyDaysAgo: Date) {
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
    prisma.user.count({ where: { enterpriseId } }),
    prisma.user.count({ where: { enterpriseId, active: true } }),
    prisma.user.count({ where: { enterpriseId, role: "STUDENT" } }),
    prisma.user.count({ where: { enterpriseId, role: "STAFF" } }),
    prisma.user.count({ where: { enterpriseId, role: "ENTERPRISE_ADMIN" } }),
    prisma.module.count({ where: { enterpriseId } }),
    prisma.team.count({ where: { enterpriseId } }),
    prisma.meeting.count({ where: { team: { enterpriseId } } }),
    prisma.user.count({ where: { enterpriseId, active: false } }),
    prisma.user.count({ where: { enterpriseId, role: "STUDENT", userModules: { none: {} } } }),
    prisma.module.count({ where: { enterpriseId, userModules: { none: {} } } }),
    prisma.user.count({ where: { enterpriseId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.module.count({ where: { enterpriseId, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  return {
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
  };
}
