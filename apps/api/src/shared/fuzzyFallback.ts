export const DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES = 2000;

type Pagination = {
  page: number;
  pageSize: number;
};

/** Returns true when strict search returned no rows but we still have a search query. */
export function shouldUseFuzzyFallback(total: number, query: string | null): query is string {
  return total === 0 && typeof query === "string" && query.trim().length > 0;
}

/** Filters candidates with fuzzy matcher and returns only the requested page. */
export function fuzzyFilterAndPaginate<T>(
  candidates: readonly T[],
  options: {
    query: string;
    pagination: Pagination;
    matches: (candidate: T, query: string) => boolean;
  },
): { items: T[]; total: number } {
  const matched = candidates.filter((candidate) => options.matches(candidate, options.query));
  const offset = (options.pagination.page - 1) * options.pagination.pageSize;
  return {
    items: matched.slice(offset, offset + options.pagination.pageSize),
    total: matched.length,
  };
}

/** Uses strict results first, then optional fuzzy fallback from a bounded candidate set. */
export async function applyFuzzyFallback<T>(
  strictResults: readonly T[],
  options: {
    query: string | null | undefined;
    fetchFallbackCandidates: (limit: number) => Promise<readonly T[]>;
    matches: (candidate: T, query: string) => boolean;
    maxCandidates?: number;
  },
): Promise<T[]> {
  const query = typeof options.query === "string" ? options.query.trim() : "";
  if (!shouldUseFuzzyFallback(strictResults.length, query)) {
    return [...strictResults];
  }

  const maxCandidates = options.maxCandidates ?? DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES;
  const candidates = await options.fetchFallbackCandidates(maxCandidates + 1);
  if (candidates.length > maxCandidates) {
    return [...strictResults];
  }

  return candidates.filter((candidate) => options.matches(candidate, query));
}
