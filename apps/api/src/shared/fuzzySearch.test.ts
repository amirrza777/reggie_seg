import { describe, expect, it } from "vitest";
import {
  matchesFuzzySearch,
  matchesFuzzySearchCandidate,
  normalizeSearchText,
  parsePositiveIntegerSearchQuery,
} from "./fuzzySearch.js";

describe("normalizeSearchText", () => {
  it("normalizes null, accents, casing, and whitespace", () => {
    expect(normalizeSearchText(null)).toBe("");
    expect(normalizeSearchText("  Éxample   Text  ")).toBe("example text");
  });
});

describe("matchesFuzzySearch", () => {
  it("returns true for empty query and false when query has no searchable sources", () => {
    expect(matchesFuzzySearch("   ", ["anything"])).toBe(true);
    expect(matchesFuzzySearch("alpha", [null, undefined, "   "])).toBe(false);
    expect(matchesFuzzySearch("alpha", ["---"])).toBe(false);
  });

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

  it("matches direct normalized includes and reverse token inclusion", () => {
    expect(matchesFuzzySearch("example", ["  Example User "])).toBe(true);
    expect(matchesFuzzySearch("testing", ["test"])).toBe(true);
    expect(matchesFuzzySearch("abc def", ["abcxxx defyyy"])).toBe(true);
  });

  it("allows up to 3 edits for long tokens", () => {
    expect(matchesFuzzySearch("abcdefghij", ["abxdefghyz"])).toBe(true);
  });

  it("matches bounded edit distance for medium token lengths", () => {
    expect(matchesFuzzySearch("kitten", ["sitten"])).toBe(true);
  });

  it("returns true when normalized query has no tokens after punctuation split", () => {
    expect(matchesFuzzySearch("---", ["anything"])).toBe(true);
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

  it("returns true for empty query and false when candidate id does not match numeric query", () => {
    expect(
      matchesFuzzySearchCandidate({
        query: "   ",
        candidateId: 7,
        sources: ["Anything"],
      }),
    ).toBe(true);

    expect(
      matchesFuzzySearchCandidate({
        query: "7",
        candidateId: 8,
        sources: ["No match here"],
      }),
    ).toBe(false);
  });
});
