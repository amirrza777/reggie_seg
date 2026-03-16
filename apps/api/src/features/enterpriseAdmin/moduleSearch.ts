import type { ParsedQs } from "qs";
import type { Prisma } from "@prisma/client";

export type EnterpriseModuleSearchFilters = {
  query: string | null;
  page: number;
  pageSize: number;
};

type ParseResult = { ok: true; value: EnterpriseModuleSearchFilters } | { ok: false; error: string };

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_QUERY_LENGTH = 120;

/** Parses the enterprise module search filters. */
export function parseEnterpriseModuleSearchFilters(query: ParsedQs): ParseResult {
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

/** Builds the enterprise module search where. */
export function buildEnterpriseModuleSearchWhere(
  baseWhere: Prisma.ModuleWhereInput,
  filters: Pick<EnterpriseModuleSearchFilters, "query">,
): Prisma.ModuleWhereInput {
  if (!filters.query) return baseWhere;

  const q = filters.query;
  const queryConditions: Prisma.ModuleWhereInput[] = [{ name: { contains: q } }];
  const numericQuery = Number(q);
  if (Number.isInteger(numericQuery) && numericQuery > 0) {
    queryConditions.push({ id: numericQuery });
  }

  return {
    AND: [baseWhere, { OR: queryConditions }],
  };
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
