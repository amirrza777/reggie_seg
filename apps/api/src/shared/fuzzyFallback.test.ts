import { describe, expect, it, vi } from "vitest";
import { applyFuzzyFallback, fuzzyFilterAndPaginate, shouldUseFuzzyFallback } from "./fuzzyFallback.js";

describe("shouldUseFuzzyFallback", () => {
  it("only enables fallback when strict search is empty and query exists", () => {
    expect(shouldUseFuzzyFallback(0, "abc")).toBe(true);
    expect(shouldUseFuzzyFallback(1, "abc")).toBe(false);
    expect(shouldUseFuzzyFallback(0, null)).toBe(false);
    expect(shouldUseFuzzyFallback(0, "   ")).toBe(false);
  });
});

describe("fuzzyFilterAndPaginate", () => {
  it("returns matched items with pagination", () => {
    const result = fuzzyFilterAndPaginate(
      [{ id: 1, value: "alpha" }, { id: 2, value: "beta" }, { id: 3, value: "alphabet" }],
      {
        query: "alp",
        pagination: { page: 1, pageSize: 1 },
        matches: (candidate, query) => candidate.value.includes(query),
      },
    );

    expect(result).toEqual({
      items: [{ id: 1, value: "alpha" }],
      total: 2,
    });
  });
});

describe("applyFuzzyFallback", () => {
  it("returns strict results when strict search has matches", async () => {
    const fetchFallbackCandidates = vi.fn().mockResolvedValue([{ id: 2, value: "beta" }]);
    const strictResults = [{ id: 1, value: "alpha" }];

    const result = await applyFuzzyFallback(strictResults, {
      query: "alp",
      fetchFallbackCandidates,
      matches: () => true,
    });

    expect(result).toEqual(strictResults);
    expect(fetchFallbackCandidates).not.toHaveBeenCalled();
  });

  it("returns fuzzy-filtered candidates when strict search is empty", async () => {
    const result = await applyFuzzyFallback([], {
      query: "alp",
      fetchFallbackCandidates: async () => [{ id: 1, value: "alpha" }, { id: 2, value: "beta" }],
      matches: (candidate, query) => candidate.value.includes(query),
    });

    expect(result).toEqual([{ id: 1, value: "alpha" }]);
  });

  it("returns strict results when fallback candidate set exceeds max limit", async () => {
    const strictResults: Array<{ id: number; value: string }> = [];

    const result = await applyFuzzyFallback(strictResults, {
      query: "alp",
      maxCandidates: 1,
      fetchFallbackCandidates: async () => [{ id: 1, value: "alpha" }, { id: 2, value: "alphabet" }],
      matches: () => true,
    });

    expect(result).toEqual(strictResults);
  });
});
