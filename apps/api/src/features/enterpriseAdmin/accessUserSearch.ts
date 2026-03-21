import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";
import { matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import { parseSearchQuery } from "../../shared/search.js";
import { parsePaginationQueryParams, readSingleQueryString, type ParseResult } from "../../shared/searchParams.js";

export type EnterpriseAccessUserSearchScope = "staff" | "students" | "all";

export type EnterpriseAccessUserSearchFilters = {
  scope: EnterpriseAccessUserSearchScope;
  query: string | null;
  page: number;
  pageSize: number;
};

export type EnterpriseAccessUserSearchCandidate = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
};

const DEFAULT_SCOPE: EnterpriseAccessUserSearchScope = "all";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Parses the enterprise access user search filters. */
export function parseEnterpriseAccessUserSearchFilters(query: ParsedQs): ParseResult<EnterpriseAccessUserSearchFilters> {
  const rawScope = readSingleQueryString(query.scope)?.trim().toLowerCase();
  const scope = parseScope(rawScope);
  if (!scope) return { ok: false, error: "scope must be one of: staff, students, all" };

  const parsedQuery = parseSearchQuery(readSingleQueryString(query.q));
  if (!parsedQuery.ok) return parsedQuery;

  const parsedPagination = parsePaginationQueryParams(
    { page: query.page, pageSize: query.pageSize },
    { defaultPage: DEFAULT_PAGE, defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE },
  );
  if (!parsedPagination.ok) return parsedPagination;

  return {
    ok: true,
    value: {
      scope,
      query: parsedQuery.value,
      page: parsedPagination.value.page,
      pageSize: parsedPagination.value.pageSize,
    },
  };
}

/** Builds the enterprise access user search where. */
export function buildEnterpriseAccessUserSearchWhere(
  enterpriseId: string,
  filters: Pick<EnterpriseAccessUserSearchFilters, "scope" | "query">,
): Prisma.UserWhereInput {
  const clauses: Prisma.UserWhereInput[] = [{ enterpriseId }];

  if (filters.scope === "staff") {
    clauses.push({ role: { in: ["STAFF", "ENTERPRISE_ADMIN", "ADMIN"] } });
  } else if (filters.scope === "students") {
    clauses.push({ role: "STUDENT" });
  }

  if (filters.query) {
    const q = filters.query;
    const queryConditions: Prisma.UserWhereInput[] = [
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
    ];
    const numericQuery = parsePositiveIntegerSearchQuery(q);
    if (numericQuery !== null) {
      queryConditions.push({ id: numericQuery });
    }
    clauses.push({ OR: queryConditions });
  }

  return clauses.length === 1 ? clauses[0]! : { AND: clauses };
}

/** Checks fuzzy match for an enterprise access-user candidate. */
export function matchesEnterpriseAccessUserSearchCandidate(
  candidate: EnterpriseAccessUserSearchCandidate,
  query: string,
): boolean {
  return matchesFuzzySearchCandidate({
    query,
    candidateId: candidate.id,
    sources: [
      candidate.email,
      candidate.firstName,
      candidate.lastName,
      `${candidate.firstName} ${candidate.lastName}`,
      `user ${candidate.id}`,
      candidate.active ? "active enabled" : "inactive suspended disabled",
    ],
  });
}

function parseScope(value: string | undefined): EnterpriseAccessUserSearchScope | null {
  if (!value) return DEFAULT_SCOPE;
  if (value === "staff" || value === "students" || value === "all") return value;
  return null;
}
