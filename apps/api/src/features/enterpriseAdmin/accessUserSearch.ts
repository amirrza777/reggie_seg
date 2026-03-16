import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";

export type EnterpriseAccessUserSearchScope = "staff" | "students" | "all";

export type EnterpriseAccessUserSearchFilters = {
  scope: EnterpriseAccessUserSearchScope;
  query: string | null;
  page: number;
  pageSize: number;
};

type ParseResult = { ok: true; value: EnterpriseAccessUserSearchFilters } | { ok: false; error: string };

const DEFAULT_SCOPE: EnterpriseAccessUserSearchScope = "all";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_QUERY_LENGTH = 120;

/** Parses the enterprise access user search filters. */
export function parseEnterpriseAccessUserSearchFilters(query: ParsedQs): ParseResult {
  const rawScope = parseSingleString(query.scope)?.trim().toLowerCase();
  const scope = parseScope(rawScope);
  if (!scope) return { ok: false, error: "scope must be one of: staff, students, all" };

  const rawQuery = parseSingleString(query.q)?.trim() ?? "";
  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return { ok: false, error: `q must be ${MAX_QUERY_LENGTH} characters or fewer` };
  }

  const page = parseOptionalPositiveInt(query.page, DEFAULT_PAGE);
  if (!page) return { ok: false, error: "page must be a positive integer" };

  const pageSize = parseOptionalPositiveInt(query.pageSize, DEFAULT_PAGE_SIZE);
  if (!pageSize) return { ok: false, error: "pageSize must be a positive integer" };
  if (pageSize > MAX_PAGE_SIZE) return { ok: false, error: `pageSize must be ${MAX_PAGE_SIZE} or less` };

  return {
    ok: true,
    value: {
      scope,
      query: rawQuery || null,
      page,
      pageSize,
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
    const numericQuery = Number(q);
    if (Number.isInteger(numericQuery) && numericQuery > 0) {
      queryConditions.push({ id: numericQuery });
    }
    clauses.push({ OR: queryConditions });
  }

  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}

function parseSingleString(value: ParsedQs[string] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseOptionalPositiveInt(value: ParsedQs[string] | undefined, fallback: number): number | null {
  const raw = parseSingleString(value);
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseScope(value: string | undefined): EnterpriseAccessUserSearchScope | null {
  if (!value) return DEFAULT_SCOPE;
  if (value === "staff" || value === "students" || value === "all") return value;
  return null;
}
