import { describe, expect, it } from "vitest";
import {
  buildEnterpriseModuleSearchWhere,
  matchesEnterpriseModuleSearchCandidate,
  parseEnterpriseModuleSearchFilters,
} from "./moduleSearch.js";

describe("parseEnterpriseModuleSearchFilters", () => {
  it("returns defaults when query params are missing", () => {
    expect(parseEnterpriseModuleSearchFilters({})).toEqual({
      ok: true,
      value: { query: null, page: 1, pageSize: 10 },
    });
  });

  it("parses query and pagination", () => {
    expect(parseEnterpriseModuleSearchFilters({ q: "segp", page: "2", pageSize: "20" })).toEqual({
      ok: true,
      value: { query: "segp", page: 2, pageSize: 20 },
    });
  });

  it("rejects invalid pagination values", () => {
    expect(parseEnterpriseModuleSearchFilters({ page: "0" })).toEqual({
      ok: false,
      error: "page must be a positive integer",
    });
    expect(parseEnterpriseModuleSearchFilters({ pageSize: "-1" })).toEqual({
      ok: false,
      error: "pageSize must be a positive integer",
    });
    expect(parseEnterpriseModuleSearchFilters({ pageSize: "101" })).toEqual({
      ok: false,
      error: "pageSize must be 100 or less",
    });
  });

  it("rejects overly long query text", () => {
    const long = "a".repeat(121);
    expect(parseEnterpriseModuleSearchFilters({ q: long })).toEqual({
      ok: false,
      error: "q must be 120 characters or fewer",
    });
  });
});

describe("buildEnterpriseModuleSearchWhere", () => {
  it("returns base where when query is empty", () => {
    const baseWhere = { enterpriseId: "ent-1" };
    expect(buildEnterpriseModuleSearchWhere(baseWhere, { query: null })).toEqual(baseWhere);
  });

  it("builds query conditions for name and numeric id", () => {
    expect(buildEnterpriseModuleSearchWhere({ enterpriseId: "ent-1" }, { query: "12" })).toEqual({
      AND: [
        { enterpriseId: "ent-1" },
        {
          OR: [{ name: { contains: "12" } }, { code: { contains: "12" } }, { id: 12 }],
        },
      ],
    });
  });
});

describe("matchesEnterpriseModuleSearchCandidate", () => {
  const module = { id: 7, name: "Internet Systems" };

  it("matches typo-tolerant names", () => {
    expect(matchesEnterpriseModuleSearchCandidate(module, "internt systms")).toBe(true);
  });

  it("matches exact numeric id query", () => {
    expect(matchesEnterpriseModuleSearchCandidate(module, "7")).toBe(true);
  });

  it("does not match unrelated query text", () => {
    expect(matchesEnterpriseModuleSearchCandidate(module, "quantum mechanics")).toBe(false);
  });

  it("matches dropped-letter inputs for short progressive search terms", () => {
    const example = { id: 8, name: "Example" };
    expect(matchesEnterpriseModuleSearchCandidate(example, "ea")).toBe(true);
    expect(matchesEnterpriseModuleSearchCandidate(example, "eam")).toBe(true);
    expect(matchesEnterpriseModuleSearchCandidate(example, "eamp")).toBe(true);
    expect(matchesEnterpriseModuleSearchCandidate(example, "eampl")).toBe(true);
  });

  it("matches shortened token query for both data and database terms", () => {
    expect(matchesEnterpriseModuleSearchCandidate({ id: 9, name: "Data Structures" }, "daa")).toBe(true);
    expect(matchesEnterpriseModuleSearchCandidate({ id: 10, name: "Database Systems" }, "daa")).toBe(true);
  });
});
