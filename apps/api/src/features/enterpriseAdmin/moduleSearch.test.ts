import { describe, expect, it } from "vitest";
import { buildEnterpriseModuleSearchWhere, parseEnterpriseModuleSearchFilters } from "./moduleSearch.js";

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
          OR: [{ name: { contains: "12" } }, { id: 12 }],
        },
      ],
    });
  });
});
