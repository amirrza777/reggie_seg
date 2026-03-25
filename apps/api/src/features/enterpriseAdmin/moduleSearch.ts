import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";
import { matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import { parseSearchQuery } from "../../shared/search.js";
import { parsePaginationQueryParams, readSingleQueryString, type ParseResult } from "../../shared/searchParams.js";

export type EnterpriseModuleSearchFilters = {
  query: string | null;
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export type EnterpriseModuleSearchCandidate = {
  id: number;
  name: string;
};

/** Parses the enterprise module search filters. */
export function parseEnterpriseModuleSearchFilters(query: ParsedQs): ParseResult<EnterpriseModuleSearchFilters> {
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
      query: parsedQuery.value,
      page: parsedPagination.value.page,
      pageSize: parsedPagination.value.pageSize,
    },
  };
}

/** Builds the enterprise module search where. */
export function buildEnterpriseModuleSearchWhere(
  baseWhere: Prisma.ModuleWhereInput,
  filters: Pick<EnterpriseModuleSearchFilters, "query">,
): Prisma.ModuleWhereInput {
  if (!filters.query) return baseWhere;

  const q = filters.query;
  const queryConditions: Prisma.ModuleWhereInput[] = [{ name: { contains: q } }];
  const numericQuery = parsePositiveIntegerSearchQuery(q);
  if (numericQuery !== null) {
    queryConditions.push({ id: numericQuery });
  }

  return {
    AND: [baseWhere, { OR: queryConditions }],
  };
}

/** Checks fuzzy match for a module search candidate. */
export function matchesEnterpriseModuleSearchCandidate(candidate: EnterpriseModuleSearchCandidate, query: string): boolean {
  return matchesFuzzySearchCandidate({
    query,
    candidateId: candidate.id,
    sources: [candidate.name, `module ${candidate.id}`],
  });
}
