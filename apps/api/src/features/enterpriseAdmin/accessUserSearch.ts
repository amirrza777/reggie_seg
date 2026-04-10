import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";
import { matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import { parseSearchQuery } from "../../shared/search.js";
import { parsePaginationQueryParams, readSingleQueryString, type ParseResult } from "../../shared/searchParams.js";

export type EnterpriseAccessUserSearchScope = "staff" | "students" | "staff_and_students" | "all";

export type EnterpriseAccessUserSearchFilters = {
  scope: EnterpriseAccessUserSearchScope;
  query: string | null;
  page: number;
  pageSize: number;
  excludeEnrolledInModuleId?: number;
  excludeOnModuleParticipation?: "all" | "lead_and_ta";
  prioritiseUserIds?: number[];
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
export const MAX_PRIORITISE_USER_IDS = 200;

/** Parses the enterprise access user search filters. */
export function parseEnterpriseAccessUserSearchFilters(query: ParsedQs): ParseResult<EnterpriseAccessUserSearchFilters> {
  const rawScope = readSingleQueryString(query.scope)?.trim().toLowerCase();
  const scope = parseScope(rawScope);
  if (!scope) {return { ok: false, error: "scope must be one of: staff, students, staff_and_students, all" };}

  const parsedQuery = parseSearchQuery(readSingleQueryString(query.q));
  if (!parsedQuery.ok) {return parsedQuery;}

  const parsedPagination = parsePaginationQueryParams(
    { page: query.page, pageSize: query.pageSize },
    { defaultPage: DEFAULT_PAGE, defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE },
  );
  if (!parsedPagination.ok) {return parsedPagination;}

  const excludeEnrolledInModuleId = parseOptionalPositiveIntQuery(query.excludeEnrolledInModule);
  const excludeOnModuleParticipation =
    excludeEnrolledInModuleId != null ? parseExcludeOnModuleParticipation(query.excludeOnModule) : undefined;
  const prioritiseUserIds = parsePrioritiseUserIdsQuery(query.prioritiseUserIds);

  return {
    ok: true,
    value: {
      scope,
      query: parsedQuery.value,
      page: parsedPagination.value.page,
      pageSize: parsedPagination.value.pageSize,
      ...(excludeEnrolledInModuleId != null
        ? { excludeEnrolledInModuleId, excludeOnModuleParticipation: excludeOnModuleParticipation ?? "all" }
        : {}),
      ...(prioritiseUserIds != null && prioritiseUserIds.length > 0 ? { prioritiseUserIds } : {}),
    },
  };
}

function parseExcludeOnModuleParticipation(value: unknown): "all" | "lead_and_ta" | undefined {
  const s = readSingleQueryString(value)?.trim().toLowerCase();
  if (!s || s === "full" || s === "all") {return "all";}
  if (s === "lead_ta" || s === "lead-ta") {return "lead_and_ta";}
  return undefined;
}

function parsePrioritiseUserIdsQuery(value: unknown): number[] | undefined {
  const raw = readSingleQueryString(value)?.trim();
  if (!raw) {return undefined;}

  const seen = new Set<number>();
  const out: number[] = [];
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (!Number.isInteger(n) || n <= 0) {continue;}
    if (seen.has(n)) {continue;}
    seen.add(n);
    if (out.length >= MAX_PRIORITISE_USER_IDS) {break;}
    out.push(n);
  }
  return out.length > 0 ? out : undefined;
}

function parseOptionalPositiveIntQuery(value: unknown): number | undefined {
  const raw =
    typeof value === "string"
      ? value
      : Array.isArray(value) && typeof value[0] === "string"
        ? value[0]
        : undefined;
  const s = raw?.trim();
  if (!s) {return undefined;}
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) {return undefined;}
  return n;
}

/** Builds the enterprise access user search. */
export function buildEnterpriseAccessUserSearchWhere(
  enterpriseId: string,
  filters: Pick<EnterpriseAccessUserSearchFilters, "scope" | "query">,
  options?: { excludeEnrolledInModuleId?: number; excludeOnModuleParticipation?: "all" | "lead_and_ta" },
): Prisma.UserWhereInput {
  const clauses: Prisma.UserWhereInput[] = [{ enterpriseId }];

  if (filters.scope === "staff") {
    clauses.push({ role: { in: ["STAFF", "ENTERPRISE_ADMIN"] } });
  } else if (filters.scope === "students") {
    clauses.push({ role: "STUDENT" });
  } else if (filters.scope === "staff_and_students") {
    clauses.push({ role: { in: ["STUDENT", "STAFF", "ENTERPRISE_ADMIN"] } });
  } else if (filters.scope === "all") {
    clauses.push({ NOT: { role: "ADMIN" } });
  }

  const excludeModuleId = options?.excludeEnrolledInModuleId;
  const excludeParticipation = options?.excludeOnModuleParticipation ?? "all";
  if (excludeModuleId != null) {
    const orClauses: Prisma.UserWhereInput[] = [
      { moduleLeads: { some: { moduleId: excludeModuleId } } },
      { moduleTeachingAssistants: { some: { moduleId: excludeModuleId } } },
    ];
    if (excludeParticipation === "all") {
      orClauses.unshift({
        userModules: { some: { moduleId: excludeModuleId, enterpriseId } },
      });
    }
    clauses.push({ NOT: { OR: orClauses } });
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
  if (!value) {return DEFAULT_SCOPE;}
  if (value === "staff" || value === "students" || value === "staff_and_students" || value === "all") {return value;}
  return null;
}
