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

export type AdminUserSearchFilters = {
  query: string | null;
  role: UserRole | null;
  active: boolean | null;
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
  pagination: { page: number; pageSize: number },
): AdminUserSearchFilters {
  return { query: parsedQuery, role, active, page: pagination.page, pageSize: pagination.pageSize };
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
  const parsedPagination = parsePaginationQueryParams(
    { page: query.page, pageSize: query.pageSize },
    { defaultPage: DEFAULT_PAGE, defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE },
  );
  if (!parsedPagination.ok) {
    return parsedPagination;
  }
  return { ok: true, value: buildAdminUserSearchFiltersValue(parsedQuery.value, role.value, active.value, parsedPagination.value) };
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

function buildUserSearchClauses(
  enterpriseId: string,
  filters: Pick<AdminUserSearchFilters, "query" | "role" | "active">,
): Prisma.UserWhereInput[] {
  const clauses: Prisma.UserWhereInput[] = [{ enterpriseId }];
  if (filters.role) {
    clauses.push({ role: filters.role });
  }
  if (filters.active !== null) {
    clauses.push({ active: filters.active });
  }
  return clauses;
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
  enterpriseId: string,
  filters: Pick<AdminUserSearchFilters, "query" | "role" | "active">,
): Prisma.UserWhereInput {
  const clauses = buildUserSearchClauses(enterpriseId, filters);
  if (filters.query) {
    clauses.push({ OR: buildUserSearchQueryConditions(filters.query) });
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
