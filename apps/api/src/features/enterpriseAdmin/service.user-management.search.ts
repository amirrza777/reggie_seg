/* eslint-disable max-lines-per-function, max-statements */
import type { ParsedQs } from "qs";
import { prisma } from "../../shared/db.js";
import {
  DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES,
  fuzzyFilterAndPaginate,
  shouldUseFuzzyFallback,
} from "../../shared/fuzzyFallback.js";
import { parseSearchQuery } from "../../shared/search.js";
import { parsePaginationQueryParams, readSingleQueryString } from "../../shared/searchParams.js";
import { isEnterpriseAdminRole } from "./service.helpers.js";
import type { EnterpriseUser } from "./types.js";
import {
  buildEnterpriseUserScopeWhere,
  buildEnterpriseUserSearchOrderBy,
  buildEnterpriseUserSearchWhere,
  matchesEnterpriseUserSearchCandidate,
  parseEnterpriseUserSortBy,
  parseEnterpriseUserSortDirection,
  resolveEnterpriseManagedUserActive,
  resolveEnterpriseUserSortDirection,
  toEnterpriseUserSearchResponse,
} from "./service.user-management.search-helpers.js";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SEARCH_MANAGED_USER_SELECT,
  type EnterpriseManagedUserSearchRecord,
  type EnterpriseUserSearchFilters,
} from "./service.user-management.types.js";

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
