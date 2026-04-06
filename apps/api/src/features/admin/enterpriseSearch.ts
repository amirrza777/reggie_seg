import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";
import { matchesFuzzySearchCandidate, normalizeSearchText } from "../../shared/fuzzySearch.js";
import { parseSearchQuery } from "../../shared/search.js";
import { parsePaginationQueryParams, readSingleQueryString, type ParseResult } from "../../shared/searchParams.js";

export type AdminEnterpriseSearchFilters = {
  query: string | null;
  page: number;
  pageSize: number;
};

export type AdminEnterpriseSearchCandidate = {
  id: string;
  code: string;
  name: string;
  users: Array<{ role: "STUDENT" | "STAFF" | "ADMIN" | "ENTERPRISE_ADMIN" }>;
};

export type AdminEnterpriseFuzzyCandidate = {
  id: string;
  code: string;
  name: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 100;

/** Parses the admin enterprise search filters. */
export function parseAdminEnterpriseSearchFilters(query: ParsedQs): ParseResult<AdminEnterpriseSearchFilters> {
  const parsedQuery = parseSearchQuery(readSingleQueryString(query.q));
  if (!parsedQuery.ok) {return parsedQuery;}

  const parsedPagination = parsePaginationQueryParams(
    { page: query.page, pageSize: query.pageSize },
    { defaultPage: DEFAULT_PAGE, defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE },
  );
  if (!parsedPagination.ok) {return parsedPagination;}

  return {
    ok: true,
    value: {
      query: parsedQuery.value,
      page: parsedPagination.value.page,
      pageSize: parsedPagination.value.pageSize,
    },
  };
}

/** Builds the admin enterprise search where. */
export function buildAdminEnterpriseSearchWhere(
  filters: Pick<AdminEnterpriseSearchFilters, "query">,
): Prisma.EnterpriseWhereInput {
  if (!filters.query) {return {};}

  const q = filters.query;
  const normalizedQuery = q.trim().toLowerCase();
  const queryConditions: Prisma.EnterpriseWhereInput[] = [
    { name: { contains: q } },
    { code: { contains: q } },
  ];

  const hintedRoles = parseRolesFromQuery(normalizedQuery);
  if (hintedRoles.length > 0) {
    queryConditions.push({ users: { some: { role: { in: hintedRoles } } } });
  }

  return { OR: queryConditions };
}

/** Checks fuzzy match for an admin enterprise search candidate. */
export function matchesAdminEnterpriseSearchCandidate(candidate: AdminEnterpriseSearchCandidate, query: string): boolean {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {return true;}

  if (matchesFuzzySearchCandidate({ query: trimmedQuery, sources: [candidate.name, candidate.code] })) {
    return true;
  }

  const hintedRoles = parseRolesFromQuery(normalizeSearchText(trimmedQuery));
  if (hintedRoles.length === 0) {return false;}
  return candidate.users.some((user) => hintedRoles.includes(user.role));
}

/** Checks fuzzy match for lightweight enterprise search candidates. */
export function matchesAdminEnterpriseFuzzyCandidate(candidate: AdminEnterpriseFuzzyCandidate, query: string): boolean {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {return true;}

  return matchesFuzzySearchCandidate({
    query: trimmedQuery,
    sources: [candidate.name, candidate.code, candidate.id],
  });
}

function parseRolesFromQuery(value: string): Array<"STUDENT" | "STAFF" | "ADMIN" | "ENTERPRISE_ADMIN"> {
  if (value === "student" || value === "students") {return ["STUDENT"];}
  if (value === "staff") {return ["STAFF"];}
  if (value === "enterprise admin" || value === "enterprise-admin" || value === "enterprise_admin") {
    return ["ENTERPRISE_ADMIN"];
  }
  if (value === "admin" || value === "admins") {return ["ADMIN", "ENTERPRISE_ADMIN"];}
  return [];
}
