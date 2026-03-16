import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";

export type AdminEnterpriseSearchFilters = {
  query: string | null;
  page: number;
  pageSize: number;
};

type ParseResult = { ok: true; value: AdminEnterpriseSearchFilters } | { ok: false; error: string };

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 100;
const MAX_QUERY_LENGTH = 120;

/** Parses the admin enterprise search filters. */
export function parseAdminEnterpriseSearchFilters(query: ParsedQs): ParseResult {
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
      query: rawQuery || null,
      page,
      pageSize,
    },
  };
}

/** Builds the admin enterprise search where. */
export function buildAdminEnterpriseSearchWhere(
  filters: Pick<AdminEnterpriseSearchFilters, "query">,
): Prisma.EnterpriseWhereInput {
  if (!filters.query) return {};

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

function parseRolesFromQuery(value: string): Array<"STUDENT" | "STAFF" | "ADMIN" | "ENTERPRISE_ADMIN"> {
  if (value === "student" || value === "students") return ["STUDENT"];
  if (value === "staff") return ["STAFF"];
  if (value === "enterprise admin" || value === "enterprise-admin" || value === "enterprise_admin") {
    return ["ENTERPRISE_ADMIN"];
  }
  if (value === "admin" || value === "admins") return ["ADMIN", "ENTERPRISE_ADMIN"];
  return [];
}
