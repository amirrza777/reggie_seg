import type { ParseResult } from "./parse.js";
export type { ParseResult } from "./parse.js";

/** Returns a query value only when it is a single string. */
export function readSingleQueryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Parses a positive integer query param with fallback when empty. */
export function parsePositiveIntQueryParam(
  value: unknown,
  options: { key: string; fallback: number },
): ParseResult<number> {
  const raw = readSingleQueryString(value);
  if (raw === undefined || raw.trim() === "") {
    return { ok: true, value: options.fallback };
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, error: `${options.key} must be a positive integer` };
  }

  return { ok: true, value: parsed };
}

/** Parses common `page` + `pageSize` search params. */
export function parsePaginationQueryParams(
  params: { page: unknown; pageSize: unknown },
  options: { defaultPage: number; defaultPageSize: number; maxPageSize: number },
): ParseResult<{ page: number; pageSize: number }> {
  const parsedPage = parsePositiveIntQueryParam(params.page, { key: "page", fallback: options.defaultPage });
  if (!parsedPage.ok) return parsedPage;

  const parsedPageSize = parsePositiveIntQueryParam(params.pageSize, {
    key: "pageSize",
    fallback: options.defaultPageSize,
  });
  if (!parsedPageSize.ok) return parsedPageSize;

  if (parsedPageSize.value > options.maxPageSize) {
    return { ok: false, error: `pageSize must be ${options.maxPageSize} or less` };
  }

  return {
    ok: true,
    value: {
      page: parsedPage.value,
      pageSize: parsedPageSize.value,
    },
  };
}
