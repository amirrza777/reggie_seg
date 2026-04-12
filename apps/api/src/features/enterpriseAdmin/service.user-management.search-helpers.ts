/* eslint-disable max-lines-per-function */
import type { Prisma, Role } from "@prisma/client";
import {
  matchesFuzzySearchCandidate,
  normalizeSearchText,
  parsePositiveIntegerSearchQuery,
} from "../../shared/fuzzySearch.js";
import type {
  EnterpriseManagedUser,
  EnterpriseManagedUserSearchRecord,
  EnterpriseUserSearchCandidate,
  EnterpriseUserSearchFilters,
  EnterpriseUserSortBy,
  EnterpriseUserSortDirection,
} from "./service.user-management.types.js";

export function buildEnterpriseUserSearchWhere(enterpriseId: string, query: string | null): Prisma.UserWhereInput {
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

export function toEnterpriseUserSearchResponse(
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

export function parseEnterpriseUserSortBy(
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

export function parseEnterpriseUserSortDirection(
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

export function resolveEnterpriseUserSortDirection(
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

export function buildEnterpriseUserSearchOrderBy(
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

export function mapManagedUser(
  user: Omit<EnterpriseManagedUser, "membershipStatus">,
  membershipStatus: EnterpriseManagedUser["membershipStatus"] = resolveMembershipStatus(user),
) {
  return {
    ...user,
    isStaff: user.role !== "STUDENT",
    membershipStatus,
  };
}

export function mapManagedUserForEnterprise(user: EnterpriseManagedUserSearchRecord, enterpriseId: string) {
  return mapManagedUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    active: resolveEnterpriseManagedUserActive(user, enterpriseId),
  }, resolveEnterpriseManagedUserStatus(user, enterpriseId));
}

export function matchesEnterpriseUserSearchCandidate(candidate: EnterpriseUserSearchCandidate, query: string): boolean {
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

export function buildEnterpriseUserScopeWhere(enterpriseId: string): Prisma.UserWhereInput {
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

export function buildEnterpriseActiveSearchWhere(enterpriseId: string, active: boolean): Prisma.UserWhereInput {
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

export function resolveEnterpriseManagedUserActive(
  user: { active: boolean; enterpriseId: string; blockedEnterpriseId: string | null },
  enterpriseId: string,
) {
  if (user.enterpriseId !== enterpriseId && user.blockedEnterpriseId === enterpriseId) {
    return false;
  }
  return user.active;
}

export function resolveMembershipStatus(user: { active: boolean }): EnterpriseManagedUser["membershipStatus"] {
  return user.active ? "active" : "inactive";
}

export function resolveEnterpriseManagedUserStatus(
  user: { active: boolean; enterpriseId: string; blockedEnterpriseId: string | null },
  enterpriseId: string,
): EnterpriseManagedUser["membershipStatus"] {
  if (user.enterpriseId !== enterpriseId && user.blockedEnterpriseId === enterpriseId) {
    return "left";
  }
  return resolveMembershipStatus(user);
}

export function parseRoleFromQuery(value: string): Role | null {
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

export function parseActiveFromQuery(value: string): boolean | null {
  if (value === "active") {
    return true;
  }
  if (value === "suspended" || value === "inactive" || value === "disabled" || value === "removed" || value === "left") {
    return false;
  }
  return null;
}

export function roleSearchLabel(role: Role): string {
  if (role === "ENTERPRISE_ADMIN") {
    return "enterprise admin";
  }
  return role.toLowerCase();
}
