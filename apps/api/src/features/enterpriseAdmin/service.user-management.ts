/* eslint-disable max-lines-per-function, max-statements, complexity, max-depth */
import type { ParsedQs } from "qs";
import type { Prisma, Role } from "@prisma/client";
import argon2 from "argon2";
import { randomBytes } from "crypto";
import { prisma } from "../../shared/db.js";
import { requestPasswordReset } from "../../auth/service.js";
import {
  DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES,
  fuzzyFilterAndPaginate,
  shouldUseFuzzyFallback,
} from "../../shared/fuzzyFallback.js";
import {
  matchesFuzzySearchCandidate,
  normalizeSearchText,
  parsePositiveIntegerSearchQuery,
} from "../../shared/fuzzySearch.js";
import { parseSearchQuery } from "../../shared/search.js";
import { parsePaginationQueryParams, readSingleQueryString } from "../../shared/searchParams.js";
import { isEnterpriseAdminRole } from "./service.helpers.js";
import type { EnterpriseUser } from "./types.js";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "admin@kcl.ac.uk").toLowerCase();
const REMOVED_USERS_ENTERPRISE_CODE = (process.env.REMOVED_USERS_ENTERPRISE_CODE ?? "UNASSIGNED").toUpperCase();
const REMOVED_USERS_ENTERPRISE_NAME = process.env.REMOVED_USERS_ENTERPRISE_NAME ?? "Unassigned";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type ManagedUserRole = Extract<Role, "STUDENT" | "STAFF">;

type EnterpriseUserSearchFilters = {
  query: string | null;
  sortBy: EnterpriseUserSortBy | null;
  sortDirection: EnterpriseUserSortDirection | null;
  page: number;
  pageSize: number;
};

type EnterpriseUserSortBy = "name" | "joinDate";
type EnterpriseUserSortDirection = "asc" | "desc";

type EnterpriseUserSearchCandidate = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  enterpriseActive: boolean;
};

type EnterpriseManagedUserBase = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
};

type EnterpriseManagedUser = EnterpriseManagedUserBase & {
  membershipStatus: "active" | "inactive" | "left";
};

type EnterpriseManagedUserSearchRecord = EnterpriseManagedUserBase & {
  enterpriseId: string;
  blockedEnterpriseId: string | null;
};

type EnterpriseManagedUserUpdate = {
  active?: boolean;
  role?: ManagedUserRole;
};

type EnterpriseManagedUserCreateInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: ManagedUserRole;
};

const MANAGED_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  active: true,
} satisfies Prisma.UserSelect;

const SEARCH_MANAGED_USER_SELECT = {
  ...MANAGED_USER_SELECT,
  enterpriseId: true,
  blockedEnterpriseId: true,
} satisfies Prisma.UserSelect;

const REINSTATABLE_USER_SELECT = {
  ...MANAGED_USER_SELECT,
  enterpriseId: true,
  blockedEnterpriseId: true,
  enterprise: { select: { code: true } },
} satisfies Prisma.UserSelect;

export function parseEnterpriseUserSearchFilters(query: unknown) {
  const raw = (query ?? {}) as ParsedQs;
  const parsedQuery = parseSearchQuery(readSingleQueryString(raw.q));
  if (!parsedQuery.ok) {
    return parsedQuery;
  }

  const pagination = parsePaginationQueryParams(
    { page: raw.page, pageSize: raw.pageSize },
    { defaultPage: DEFAULT_PAGE, defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE },
  );
  if (!pagination.ok) {
    return pagination;
  }

  const sortBy = parseEnterpriseUserSortBy(readSingleQueryString(raw.sortBy));
  if (!sortBy.ok) {
    return sortBy;
  }
  const sortDirection = parseEnterpriseUserSortDirection(readSingleQueryString(raw.sortDirection));
  if (!sortDirection.ok) {
    return sortDirection;
  }
  if (!sortBy.value && sortDirection.value) {
    return { ok: false as const, error: "sortDirection requires sortBy" };
  }

  return {
    ok: true as const,
    value: {
      query: parsedQuery.value,
      sortBy: sortBy.value,
      sortDirection: resolveEnterpriseUserSortDirection(sortBy.value, sortDirection.value),
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    },
  };
}

export async function searchEnterpriseUsers(enterpriseUser: EnterpriseUser, filters: EnterpriseUserSearchFilters) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const where = buildEnterpriseUserSearchWhere(enterpriseUser.enterpriseId, filters.query);
  const orderBy = buildEnterpriseUserSearchOrderBy(filters);
  const [total, records] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: SEARCH_MANAGED_USER_SELECT,
      orderBy,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  const strictResponse = toEnterpriseUserSearchResponse(records, filters, total, enterpriseUser.enterpriseId);
  if (!shouldUseFuzzyFallback(total, filters.query)) {
    return { ok: true as const, value: strictResponse };
  }

  const fuzzyWhere = buildEnterpriseUserScopeWhere(enterpriseUser.enterpriseId);
  const candidateTotal = await prisma.user.count({ where: fuzzyWhere });
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) {
    return { ok: true as const, value: strictResponse };
  }

  const candidates = await prisma.user.findMany({
    where: fuzzyWhere,
    select: SEARCH_MANAGED_USER_SELECT,
    orderBy: [{ id: "asc" }],
    take: candidateTotal,
  });
  const fuzzyCandidates = candidates.map((candidate) => ({
    ...candidate,
    enterpriseActive: resolveEnterpriseManagedUserActive(candidate, enterpriseUser.enterpriseId),
  }));

  const fuzzyPage = fuzzyFilterAndPaginate(fuzzyCandidates, {
    query: filters.query ?? "",
    pagination: filters,
    matches: matchesEnterpriseUserSearchCandidate,
  });

  if (fuzzyPage.total === 0) {
    return { ok: true as const, value: toEnterpriseUserSearchResponse([], filters, 0, enterpriseUser.enterpriseId) };
  }

  const pageIds = fuzzyPage.items.map((user) => user.id);
  const pageRecords = await prisma.user.findMany({
    where: {
      AND: [
        buildEnterpriseUserScopeWhere(enterpriseUser.enterpriseId),
        { id: { in: pageIds } },
      ],
    },
    select: SEARCH_MANAGED_USER_SELECT,
  });
  const pageRecordsById = new Map(pageRecords.map((record) => [record.id, record]));
  const orderedPageRecords = pageIds
    .map((id) => pageRecordsById.get(id))
    .filter((record): record is EnterpriseManagedUserSearchRecord => Boolean(record));

  return {
    ok: true as const,
    value: toEnterpriseUserSearchResponse(orderedPageRecords, filters, fuzzyPage.total, enterpriseUser.enterpriseId),
  };
}

export async function updateEnterpriseUser(
  enterpriseUser: EnterpriseUser,
  targetUserId: number,
  data: EnterpriseManagedUserUpdate,
) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const targetUser = await resolveManagedTargetUser(enterpriseUser, targetUserId);
  if (!targetUser.ok) {
    if (targetUser.status === 404 && data.active === true) {
      const reinstated = await tryReinstateRemovedUser(enterpriseUser, targetUserId, data.role);
      if (reinstated.ok) {
        return { ok: true as const, value: mapManagedUser(reinstated.value) };
      }
      return reinstated;
    }
    return targetUser;
  }
  if (data.active === false && targetUser.value.id === enterpriseUser.id) {
    return { ok: false as const, status: 400, error: "You cannot remove your own enterprise access" };
  }
  if (targetUser.value.role === "ENTERPRISE_ADMIN" && enterpriseUser.role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Enterprise admin accounts can only be managed by platform admins" };
  }

  if (data.role && targetUser.value.role === "ENTERPRISE_ADMIN") {
    return { ok: false as const, status: 403, error: "Enterprise admin permissions are managed by invite flow" };
  }

  const updateData: Prisma.UserUpdateInput = {};
  if (typeof data.active === "boolean") {
    updateData.active = data.active;
  }
  if (data.role) {
    updateData.role = data.role;
  }

  if (Object.keys(updateData).length === 0) {
    return { ok: true as const, value: mapManagedUser(targetUser.value, resolveMembershipStatus(targetUser.value)) };
  }

  const updated = data.active === false
    ? await prisma.$transaction(async (tx) => {
      await removeUserEnterpriseAccessInTransaction(tx, enterpriseUser.enterpriseId, targetUserId);
      return tx.user.update({
        where: { id: targetUserId },
        data: updateData,
        select: MANAGED_USER_SELECT,
      });
    })
    : await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: MANAGED_USER_SELECT,
    });

  return { ok: true as const, value: mapManagedUser(updated, resolveMembershipStatus(updated)) };
}

export async function createEnterpriseUser(
  enterpriseUser: EnterpriseUser,
  data: EnterpriseManagedUserCreateInput,
) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  const role = data.role ?? "STUDENT";
  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();

  const inEnterprise = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId: enterpriseUser.enterpriseId,
        email: normalizedEmail,
      },
    },
    select: REINSTATABLE_USER_SELECT,
  });

  if (inEnterprise) {
    if (inEnterprise.email.toLowerCase() === SUPER_ADMIN_EMAIL || inEnterprise.role === "ADMIN") {
      return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
    }
    if (inEnterprise.role === "ENTERPRISE_ADMIN") {
      return { ok: false as const, status: 403, error: "Enterprise admin permissions are managed by invite flow" };
    }

    const updateData: Prisma.UserUpdateInput = {
      active: true,
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      role,
    };

    const updated = await prisma.user.update({
      where: { id: inEnterprise.id },
      data: updateData,
      select: MANAGED_USER_SELECT,
    });
    return { ok: true as const, value: mapManagedUser(updated, resolveMembershipStatus(updated)) };
  }

  const matchingEmailAccounts = await prisma.user.findMany({
    where: { email: normalizedEmail },
    select: REINSTATABLE_USER_SELECT,
    orderBy: [{ id: "asc" }],
  });

  if (matchingEmailAccounts.length > 0) {
    const reinstatableAccounts = matchingEmailAccounts.filter((account) => {
      const accountEnterpriseCode = account.enterprise?.code?.toUpperCase();
      return (
        accountEnterpriseCode === REMOVED_USERS_ENTERPRISE_CODE &&
        account.blockedEnterpriseId === enterpriseUser.enterpriseId
      );
    });
    const hasConflictingAccount = matchingEmailAccounts.some((account) => !reinstatableAccounts.includes(account));

    if (hasConflictingAccount || reinstatableAccounts.length !== 1) {
      return { ok: false as const, status: 409, error: "This email is already used in another enterprise" };
    }

    const [globalAccount] = reinstatableAccounts;
    if (!globalAccount) {
      return { ok: false as const, status: 409, error: "This email is already used in another enterprise" };
    }
    if (globalAccount.email.toLowerCase() === SUPER_ADMIN_EMAIL || globalAccount.role === "ADMIN") {
      return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
    }
    if (globalAccount.role === "ENTERPRISE_ADMIN") {
      return { ok: false as const, status: 403, error: "Enterprise admin permissions are managed by invite flow" };
    }

    const reinstated = await prisma.user.update({
      where: { id: globalAccount.id },
      data: {
        enterpriseId: enterpriseUser.enterpriseId,
        blockedEnterpriseId: null,
        active: true,
        role,
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
      },
      select: MANAGED_USER_SELECT,
    });
    await triggerPasswordSetupEmail(reinstated.email);

    return { ok: true as const, value: mapManagedUser(reinstated, resolveMembershipStatus(reinstated)) };
  }

  const passwordHash = await argon2.hash(randomBytes(32).toString("hex"));
  try {
    const created = await prisma.user.create({
      data: {
        enterpriseId: enterpriseUser.enterpriseId,
        email: normalizedEmail,
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        role,
        passwordHash,
      },
      select: MANAGED_USER_SELECT,
    });
    await triggerPasswordSetupEmail(created.email);
    return { ok: true as const, value: mapManagedUser(created, resolveMembershipStatus(created)) };
  } catch (error) {
    const maybeCode = (error as { code?: unknown })?.code;
    if (maybeCode === "P2002") {
      return { ok: false as const, status: 409, error: "This email is already in use" };
    }
    throw error;
  }
}

async function triggerPasswordSetupEmail(email: string) {
  try {
    await requestPasswordReset(email);
  } catch (error) {
    console.error("Failed to send enterprise account password setup email.", error);
  }
}

export async function removeEnterpriseUser(enterpriseUser: EnterpriseUser, targetUserId: number) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const targetUser = await resolveManagedTargetUser(enterpriseUser, targetUserId);
  if (!targetUser.ok) {
    return targetUser;
  }
  if (targetUser.value.id === enterpriseUser.id) {
    return { ok: false as const, status: 400, error: "You cannot remove your own enterprise access" };
  }
  if (targetUser.value.role === "ENTERPRISE_ADMIN" && enterpriseUser.role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Enterprise admin accounts can only be managed by platform admins" };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await removeUserEnterpriseAccessInTransaction(tx, enterpriseUser.enterpriseId, targetUserId);
    const holdingEnterpriseId = await resolveRemovedUsersEnterpriseId(tx);

    return tx.user.update({
      where: { id: targetUserId },
      data: {
        enterpriseId: holdingEnterpriseId,
        blockedEnterpriseId: enterpriseUser.enterpriseId,
        role: "STUDENT",
        active: true,
      },
      select: MANAGED_USER_SELECT,
    });
  });

  return { ok: true as const, value: mapManagedUser(updated, "left") };
}

function buildEnterpriseUserSearchWhere(enterpriseId: string, query: string | null): Prisma.UserWhereInput {
  const clauses: Prisma.UserWhereInput[] = [buildEnterpriseUserScopeWhere(enterpriseId)];
  if (query) {
    const queryConditions: Prisma.UserWhereInput[] = [
      { email: { contains: query } },
      { firstName: { contains: query } },
      { lastName: { contains: query } },
    ];

    const hintedRole = parseRoleFromQuery(normalizeSearchText(query));
    if (hintedRole) {
      queryConditions.push({ role: hintedRole });
    }

    const hintedActive = parseActiveFromQuery(normalizeSearchText(query));
    if (hintedActive !== null) {
      queryConditions.push(buildEnterpriseActiveSearchWhere(enterpriseId, hintedActive));
    }

    const numericQuery = parsePositiveIntegerSearchQuery(query);
    if (numericQuery !== null) {
      queryConditions.push({ id: numericQuery });
    }
    clauses.push({ OR: queryConditions });
  }

  return clauses.length === 1 ? clauses[0]! : { AND: clauses };
}

function toEnterpriseUserSearchResponse(
  items: EnterpriseManagedUserSearchRecord[],
  filters: EnterpriseUserSearchFilters,
  total: number,
  enterpriseId: string,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items: items.map((item) => mapManagedUserForEnterprise(item, enterpriseId)),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
  };
}

function parseEnterpriseUserSortBy(
  rawSortBy: string | null | undefined,
): { ok: true; value: EnterpriseUserSortBy | null } | { ok: false; error: string } {
  const normalizedSortBy = rawSortBy?.trim().toLowerCase();
  if (!normalizedSortBy) {
    return { ok: true as const, value: null };
  }
  if (normalizedSortBy === "name" || normalizedSortBy === "joindate") {
    return { ok: true as const, value: normalizedSortBy === "joindate" ? "joinDate" : "name" };
  }
  return { ok: false as const, error: "sortBy must be name or joinDate" };
}

function parseEnterpriseUserSortDirection(
  rawSortDirection: string | null | undefined,
): { ok: true; value: EnterpriseUserSortDirection | null } | { ok: false; error: string } {
  const normalizedSortDirection = rawSortDirection?.trim().toLowerCase();
  if (!normalizedSortDirection) {
    return { ok: true as const, value: null };
  }
  if (normalizedSortDirection === "asc" || normalizedSortDirection === "desc") {
    return { ok: true as const, value: normalizedSortDirection };
  }
  return { ok: false as const, error: "sortDirection must be asc or desc" };
}

function resolveEnterpriseUserSortDirection(
  sortBy: EnterpriseUserSortBy | null,
  sortDirection: EnterpriseUserSortDirection | null,
): EnterpriseUserSortDirection | null {
  if (!sortBy) {
    return null;
  }
  if (sortDirection) {
    return sortDirection;
  }
  return sortBy === "joinDate" ? "desc" : "asc";
}

function buildEnterpriseUserSearchOrderBy(
  filters: Pick<EnterpriseUserSearchFilters, "sortBy" | "sortDirection">,
): Prisma.UserOrderByWithRelationInput[] {
  if (filters.sortBy === "joinDate") {
    const direction: EnterpriseUserSortDirection = filters.sortDirection ?? "desc";
    return [{ createdAt: direction }, { id: "asc" }];
  }
  if (filters.sortBy === "name") {
    const direction: EnterpriseUserSortDirection = filters.sortDirection ?? "asc";
    return [{ firstName: direction }, { lastName: direction }, { id: "asc" }];
  }
  return [{ id: "asc" }];
}

function mapManagedUser(user: Omit<EnterpriseManagedUser, "membershipStatus">, membershipStatus: EnterpriseManagedUser["membershipStatus"] = resolveMembershipStatus(user)) {
  return {
    ...user,
    isStaff: user.role !== "STUDENT",
    membershipStatus,
  };
}

function mapManagedUserForEnterprise(user: EnterpriseManagedUserSearchRecord, enterpriseId: string) {
  return mapManagedUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    active: resolveEnterpriseManagedUserActive(user, enterpriseId),
  }, resolveEnterpriseManagedUserStatus(user, enterpriseId));
}

function matchesEnterpriseUserSearchCandidate(candidate: EnterpriseUserSearchCandidate, query: string): boolean {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return true;
  }

  const numericQuery = parsePositiveIntegerSearchQuery(trimmedQuery);
  if (numericQuery !== null && candidate.id === numericQuery) {
    return true;
  }

  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const hintedRole = parseRoleFromQuery(normalizedQuery);
  if (hintedRole && candidate.role === hintedRole) {
    return true;
  }

  const hintedActive = parseActiveFromQuery(normalizedQuery);
  if (hintedActive !== null && candidate.enterpriseActive === hintedActive) {
    return true;
  }

  return matchesFuzzySearchCandidate({
    query: trimmedQuery,
    sources: [
      candidate.email,
      candidate.firstName,
      candidate.lastName,
      `${candidate.firstName} ${candidate.lastName}`,
      roleSearchLabel(candidate.role),
      candidate.enterpriseActive ? "active enabled" : "inactive suspended disabled removed left",
      `user ${candidate.id}`,
    ],
  });
}

function buildEnterpriseUserScopeWhere(enterpriseId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { enterpriseId },
      {
        blockedEnterpriseId: enterpriseId,
        enterpriseId: { not: enterpriseId },
      },
    ],
  };
}

function buildEnterpriseActiveSearchWhere(enterpriseId: string, active: boolean): Prisma.UserWhereInput {
  if (active) {
    return {
      enterpriseId,
      active: true,
    };
  }
  return {
    OR: [
      {
        enterpriseId,
        active: false,
      },
      {
        blockedEnterpriseId: enterpriseId,
        enterpriseId: { not: enterpriseId },
      },
    ],
  };
}

function resolveEnterpriseManagedUserActive(user: { active: boolean; enterpriseId: string; blockedEnterpriseId: string | null }, enterpriseId: string) {
  if (user.enterpriseId !== enterpriseId && user.blockedEnterpriseId === enterpriseId) {
    return false;
  }
  return user.active;
}

function resolveMembershipStatus(user: { active: boolean }): EnterpriseManagedUser["membershipStatus"] {
  return user.active ? "active" : "inactive";
}

function resolveEnterpriseManagedUserStatus(
  user: { active: boolean; enterpriseId: string; blockedEnterpriseId: string | null },
  enterpriseId: string,
): EnterpriseManagedUser["membershipStatus"] {
  if (user.enterpriseId !== enterpriseId && user.blockedEnterpriseId === enterpriseId) {
    return "left";
  }
  return resolveMembershipStatus(user);
}

function parseRoleFromQuery(value: string): Role | null {
  if (value === "student" || value === "students") {
    return "STUDENT";
  }
  if (value === "staff") {
    return "STAFF";
  }
  if (value === "admin" || value === "admins") {
    return "ADMIN";
  }
  if (value === "enterprise admin" || value === "enterprise-admin" || value === "enterprise_admin") {
    return "ENTERPRISE_ADMIN";
  }
  return null;
}

function parseActiveFromQuery(value: string): boolean | null {
  if (value === "active") {
    return true;
  }
  if (value === "suspended" || value === "inactive" || value === "disabled" || value === "removed" || value === "left") {
    return false;
  }
  return null;
}

function roleSearchLabel(role: Role): string {
  if (role === "ENTERPRISE_ADMIN") {
    return "enterprise admin";
  }
  return role.toLowerCase();
}

async function resolveManagedTargetUser(enterpriseUser: EnterpriseUser, targetUserId: number) {
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      enterpriseId: enterpriseUser.enterpriseId,
    },
    select: MANAGED_USER_SELECT,
  });
  if (!targetUser) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return { ok: false as const, status: 400, error: "Cannot modify super admin" };
  }
  if (targetUser.role === "ADMIN") {
    return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
  }
  return { ok: true as const, value: targetUser };
}

async function removeUserEnterpriseAccessInTransaction(tx: Prisma.TransactionClient, enterpriseId: string, userId: number) {
  await tx.moduleLead.deleteMany({
    where: {
      userId,
      module: { enterpriseId },
    },
  });
  await tx.moduleTeachingAssistant.deleteMany({
    where: {
      userId,
      module: { enterpriseId },
    },
  });
  await tx.userModule.deleteMany({
    where: {
      enterpriseId,
      userId,
    },
  });
  await tx.refreshToken.updateMany({
    where: {
      userId,
      revoked: false,
    },
    data: {
      revoked: true,
    },
  });
}

async function tryReinstateRemovedUser(
  enterpriseUser: EnterpriseUser,
  targetUserId: number,
  roleOverride?: ManagedUserRole,
) {
  const candidate = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: REINSTATABLE_USER_SELECT,
  });
  if (!candidate) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  const candidateEnterpriseCode = candidate.enterprise?.code?.toUpperCase();
  if (candidate.email.toLowerCase() === SUPER_ADMIN_EMAIL || candidate.role === "ADMIN") {
    return { ok: false as const, status: 404, error: "User not found" };
  }

  if (candidateEnterpriseCode !== REMOVED_USERS_ENTERPRISE_CODE) {
    if (candidate.blockedEnterpriseId === enterpriseUser.enterpriseId && candidate.enterpriseId !== enterpriseUser.enterpriseId) {
      return { ok: false as const, status: 409, error: "User is in another enterprise" };
    }
    return { ok: false as const, status: 404, error: "User not found" };
  }

  const reinstated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      enterpriseId: enterpriseUser.enterpriseId,
      blockedEnterpriseId: null,
      active: true,
      role: roleOverride ?? "STUDENT",
    },
    select: MANAGED_USER_SELECT,
  });

  return { ok: true as const, value: reinstated };
}

async function resolveRemovedUsersEnterpriseId(tx: Prisma.TransactionClient) {
  const enterprise = await tx.enterprise.upsert({
    where: { code: REMOVED_USERS_ENTERPRISE_CODE },
    update: {},
    create: {
      code: REMOVED_USERS_ENTERPRISE_CODE,
      name: REMOVED_USERS_ENTERPRISE_NAME,
    },
    select: { id: true },
  });
  return enterprise.id;
}
