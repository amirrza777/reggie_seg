import { describe, expect, it } from "vitest";
import { matchesFuzzySearch, matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "./fuzzySearch.js";

describe("matchesFuzzySearch", () => {
  it("matches ordered-subsequence inputs for dropped letters", () => {
    expect(matchesFuzzySearch("ea", ["Example"])).toBe(true);
    expect(matchesFuzzySearch("eam", ["Example"])).toBe(true);
    expect(matchesFuzzySearch("eamp", ["Example"])).toBe(true);
    expect(matchesFuzzySearch("eampl", ["Example"])).toBe(true);
  });

  it("matches shortened token queries across similar names", () => {
    expect(matchesFuzzySearch("daa", ["Data Structures"])).toBe(true);
    expect(matchesFuzzySearch("daa", ["Database Systems"])).toBe(true);
  });
});

describe("parsePositiveIntegerSearchQuery", () => {
  it("parses positive integers and rejects non-positive or non-integer values", () => {
    expect(parsePositiveIntegerSearchQuery("12")).toBe(12);
    expect(parsePositiveIntegerSearchQuery(" 7 ")).toBe(7);
    expect(parsePositiveIntegerSearchQuery("0")).toBeNull();
    expect(parsePositiveIntegerSearchQuery("-1")).toBeNull();
    expect(parsePositiveIntegerSearchQuery("7.2")).toBeNull();
    expect(parsePositiveIntegerSearchQuery("abc")).toBeNull();
    expect(parsePositiveIntegerSearchQuery("")).toBeNull();
    expect(parsePositiveIntegerSearchQuery(null)).toBeNull();
  });
});

describe("matchesFuzzySearchCandidate", () => {
  it("supports exact numeric-id match and fuzzy source match", () => {
    expect(
      matchesFuzzySearchCandidate({
        query: "42",
        candidateId: 42,
        sources: ["Other Name"],
      }),
    ).toBe(true);

    expect(
      matchesFuzzySearchCandidate({
        query: "eampl",
        candidateId: 10,
        sources: ["Example"],
      }),
    ).toBe(true);

    expect(
      matchesFuzzySearchCandidate({
        query: "999",
        candidateId: 10,
        sources: ["Example"],
      }),
    ).toBe(false);
  });
});
