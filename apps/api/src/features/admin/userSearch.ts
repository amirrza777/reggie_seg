import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";

type UserRole = "STUDENT" | "STAFF" | "ADMIN" | "ENTERPRISE_ADMIN";

export type AdminUserSearchFilters = {
  query: string | null;
  role: UserRole | null;
  active: boolean | null;
  page: number;
  pageSize: number;
};

type ParseResult = { ok: true; value: AdminUserSearchFilters } | { ok: false; error: string };

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_QUERY_LENGTH = 120;

/** Parses the admin user search filters. */
export function parseAdminUserSearchFilters(query: ParsedQs): ParseResult {
  const rawQuery = parseSingleString(query.q)?.trim() ?? "";
  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return { ok: false, error: `q must be ${MAX_QUERY_LENGTH} characters or fewer` };
  }

  const rawRole = parseSingleString(query.role)?.trim().toUpperCase();
  if (rawRole && !isUserRole(rawRole)) {
    return { ok: false, error: "Invalid role filter" };
  }

  const rawActive = parseSingleString(query.active)?.trim().toLowerCase();
  let active: boolean | null = null;
  if (rawActive !== undefined) {
    if (rawActive === "true" || rawActive === "1") active = true;
    else if (rawActive === "false" || rawActive === "0") active = false;
    else return { ok: false, error: "active must be true or false" };
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
      role: rawRole ?? null,
      active,
      page,
      pageSize,
    },
  };
}

/** Builds the admin user search where. */
export function buildAdminUserSearchWhere(
  enterpriseId: string,
  filters: Pick<AdminUserSearchFilters, "query" | "role" | "active">,
): Prisma.UserWhereInput {
  const clauses: Prisma.UserWhereInput[] = [{ enterpriseId }];

  if (filters.role) {
    clauses.push({ role: filters.role });
  }
  if (filters.active !== null) {
    clauses.push({ active: filters.active });
  }

  if (filters.query) {
    const q = filters.query;
    const normalizedQuery = q.trim().toLowerCase();
    const queryConditions: Prisma.UserWhereInput[] = [
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
    ];

    const hintedRole = parseRoleFromQuery(normalizedQuery);
    if (hintedRole) queryConditions.push({ role: hintedRole });

    const hintedActive = parseActiveFromQuery(normalizedQuery);
    if (hintedActive !== null) queryConditions.push({ active: hintedActive });

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

function isUserRole(value: string): value is UserRole {
  return value === "STUDENT" || value === "STAFF" || value === "ADMIN" || value === "ENTERPRISE_ADMIN";
}

function parseRoleFromQuery(value: string): UserRole | null {
  if (value === "student" || value === "students") return "STUDENT";
  if (value === "staff") return "STAFF";
  if (value === "admin" || value === "admins") return "ADMIN";
  if (value === "enterprise admin" || value === "enterprise-admin" || value === "enterprise_admin") {
    return "ENTERPRISE_ADMIN";
  }
  return null;
}

function parseActiveFromQuery(value: string): boolean | null {
  if (value === "active") return true;
  if (value === "suspended" || value === "inactive" || value === "disabled") return false;
  return null;
}
