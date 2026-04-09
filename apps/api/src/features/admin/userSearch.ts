import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";
import {
  matchesFuzzySearchCandidate,
  normalizeSearchText,
  parsePositiveIntegerSearchQuery,
} from "../../shared/fuzzySearch.js";
import { parseSearchQuery } from "../../shared/search.js";
import { parsePaginationQueryParams, readSingleQueryString, type ParseResult } from "../../shared/searchParams.js";

type UserRole = "STUDENT" | "STAFF" | "ADMIN" | "ENTERPRISE_ADMIN";
type UserSortBy = "name" | "joinDate";
type UserSortDirection = "asc" | "desc";

type AdminUserSearchScopeFilters = Pick<AdminUserSearchFilters, "query" | "role" | "active"> & {
  enterpriseId?: string | null;
};

export type AdminUserSearchFilters = {
  query: string | null;
  role: UserRole | null;
  active: boolean | null;
  sortBy: UserSortBy | null;
  sortDirection: UserSortDirection | null;
  page: number;
  pageSize: number;
};

export type AdminUserSearchCandidate = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function buildAdminUserSearchFiltersValue(
  parsedQuery: string | null,
  role: UserRole | null,
  active: boolean | null,
  sortBy: UserSortBy | null,
  sortDirection: UserSortDirection | null,
  pagination: { page: number; pageSize: number },
): AdminUserSearchFilters {
  return {
    query: parsedQuery,
    role,
    active,
    sortBy,
    sortDirection,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

function parseRoleFilter(rawRole: string | undefined): ParseResult<UserRole | null> {
  const normalizedRole = rawRole?.trim().toUpperCase();
  if (!normalizedRole) {
    return { ok: true, value: null };
  }
  if (!isUserRole(normalizedRole)) {
    return { ok: false, error: "Invalid role filter" };
  }
  return { ok: true, value: normalizedRole };
}

function parseActiveFilter(rawActive: string | undefined): ParseResult<boolean | null> {
  const normalizedActive = rawActive?.trim().toLowerCase();
  if (normalizedActive === undefined) {
    return { ok: true, value: null };
  }
  if (normalizedActive === "true" || normalizedActive === "1") {
    return { ok: true, value: true };
  }
  if (normalizedActive === "false" || normalizedActive === "0") {
    return { ok: true, value: false };
  }
  return { ok: false, error: "active must be true or false" };
}

function parseSortBy(rawSortBy: string | undefined): ParseResult<UserSortBy | null> {
  const normalizedSortBy = rawSortBy?.trim().toLowerCase();
  if (!normalizedSortBy) {
    return { ok: true, value: null };
  }
  if (normalizedSortBy === "name" || normalizedSortBy === "joindate") {
    return { ok: true, value: normalizedSortBy === "joindate" ? "joinDate" : "name" };
  }
  return { ok: false, error: "Invalid sortBy filter" };
}

function parseSortDirection(rawSortDirection: string | undefined): ParseResult<UserSortDirection | null> {
  const normalizedSortDirection = rawSortDirection?.trim().toLowerCase();
  if (!normalizedSortDirection) {
    return { ok: true, value: null };
  }
  if (normalizedSortDirection === "asc" || normalizedSortDirection === "desc") {
    return { ok: true, value: normalizedSortDirection };
  }
  return { ok: false, error: "Invalid sortDirection filter" };
}

function resolveSortDirection(sortBy: UserSortBy | null, sortDirection: UserSortDirection | null): UserSortDirection | null {
  if (!sortBy) {
    return null;
  }
  if (sortDirection) {
    return sortDirection;
  }
  return sortBy === "joinDate" ? "desc" : "asc";
}

/** Parses the admin user search filters. */
export function parseAdminUserSearchFilters(query: ParsedQs): ParseResult<AdminUserSearchFilters> {
  const parsedQuery = parseSearchQuery(readSingleQueryString(query.q));
  if (!parsedQuery.ok) {
    return parsedQuery;
  }
  const role = parseRoleFilter(readSingleQueryString(query.role));
  if (!role.ok) {
    return role;
  }
  const active = parseActiveFilter(readSingleQueryString(query.active));
  if (!active.ok) {
    return active;
  }
  const sortBy = parseSortBy(readSingleQueryString(query.sortBy));
  if (!sortBy.ok) {
    return sortBy;
  }
  const sortDirection = parseSortDirection(readSingleQueryString(query.sortDirection));
  if (!sortDirection.ok) {
    return sortDirection;
  }
  if (!sortBy.value && sortDirection.value) {
    return { ok: false, error: "sortDirection requires sortBy" };
  }
  const parsedPagination = parsePaginationQueryParams(
    { page: query.page, pageSize: query.pageSize },
    { defaultPage: DEFAULT_PAGE, defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE },
  );
  if (!parsedPagination.ok) {
    return parsedPagination;
  }
  return {
    ok: true,
    value: buildAdminUserSearchFiltersValue(
      parsedQuery.value,
      role.value,
      active.value,
      sortBy.value,
      resolveSortDirection(sortBy.value, sortDirection.value),
      parsedPagination.value,
    ),
  };
}

function buildUserSearchQueryConditions(query: string): Prisma.UserWhereInput[] {
  const normalizedQuery = query.trim().toLowerCase();
  const queryConditions: Prisma.UserWhereInput[] = [
    { email: { contains: query } },
    { firstName: { contains: query } },
    { lastName: { contains: query } },
  ];

  const hintedRole = parseRoleFromQuery(normalizedQuery);
  if (hintedRole) {
    queryConditions.push({ role: hintedRole });
  }
  const hintedActive = parseActiveFromQuery(normalizedQuery);
  if (hintedActive !== null) {
    queryConditions.push({ active: hintedActive });
  }

  const numericQuery = parsePositiveIntegerSearchQuery(query);
  if (numericQuery !== null) {
    queryConditions.push({ id: numericQuery });
  }
  return queryConditions;
}

function buildUserSearchClauses(filters: AdminUserSearchScopeFilters): Prisma.UserWhereInput[] {
  const clauses: Prisma.UserWhereInput[] = [];
  if (filters.enterpriseId) {
    clauses.push({ enterpriseId: filters.enterpriseId });
  }
  if (filters.role) {
    clauses.push({ role: filters.role });
  }
  if (filters.active !== null) {
    clauses.push({ active: filters.active });
  }
  return clauses;
}

function resolveSearchScopeFilters(
  enterpriseIdOrFilters: string | AdminUserSearchScopeFilters,
  filters?: Pick<AdminUserSearchFilters, "query" | "role" | "active">,
): AdminUserSearchScopeFilters {
  if (typeof enterpriseIdOrFilters === "string") {
    return {
      enterpriseId: enterpriseIdOrFilters,
      query: filters?.query ?? null,
      role: filters?.role ?? null,
      active: filters?.active ?? null,
    };
  }
  return enterpriseIdOrFilters;
}

function buildAdminUserSearchCandidateSources(candidate: AdminUserSearchCandidate): string[] {
  return [
    candidate.email,
    candidate.firstName,
    candidate.lastName,
    `${candidate.firstName} ${candidate.lastName}`,
    candidate.role,
    candidate.active ? "active enabled" : "inactive suspended disabled",
    `user ${candidate.id}`,
  ];
}

/** Builds the admin user search where. */
export function buildAdminUserSearchWhere(
  enterpriseIdOrFilters: string | AdminUserSearchScopeFilters,
  filters?: Pick<AdminUserSearchFilters, "query" | "role" | "active">,
): Prisma.UserWhereInput {
  const scopeFilters = resolveSearchScopeFilters(enterpriseIdOrFilters, filters);
  const clauses = buildUserSearchClauses(scopeFilters);
  if (scopeFilters.query) {
    clauses.push({ OR: buildUserSearchQueryConditions(scopeFilters.query) });
  }
  if (clauses.length === 0) {
    return {};
  }
  return clauses.length === 1 ? clauses[0]! : { AND: clauses };
}

/** Checks fuzzy match for an admin user search candidate. */
export function matchesAdminUserSearchCandidate(candidate: AdminUserSearchCandidate, query: string): boolean {
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
  if (hintedActive !== null && candidate.active === hintedActive) {
    return true;
  }
  return matchesFuzzySearchCandidate({ query: trimmedQuery, sources: buildAdminUserSearchCandidateSources(candidate) });
}

export function buildAdminUserSearchOrderBy(
  filters: Pick<AdminUserSearchFilters, "sortBy" | "sortDirection">,
): Prisma.UserOrderByWithRelationInput[] {
  if (filters.sortBy === "joinDate") {
    const direction: UserSortDirection = filters.sortDirection ?? "desc";
    return [{ createdAt: direction }, { id: "asc" }];
  }
  if (filters.sortBy === "name") {
    const direction: UserSortDirection = filters.sortDirection ?? "asc";
    return [{ firstName: direction }, { lastName: direction }, { id: "asc" }];
  }
  return [{ id: "asc" }];
}

function isUserRole(value: string): value is UserRole {
  return value === "STUDENT" || value === "STAFF" || value === "ADMIN" || value === "ENTERPRISE_ADMIN";
}

function parseRoleFromQuery(value: string): UserRole | null {
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
  if (value === "suspended" || value === "inactive" || value === "disabled") {
    return false;
  }
  return null;
}
