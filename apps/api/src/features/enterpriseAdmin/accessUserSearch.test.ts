import { describe, expect, it } from "vitest";
import {
  buildEnterpriseAccessUserSearchWhere,
  matchesEnterpriseAccessUserSearchCandidate,
  parseEnterpriseAccessUserSearchFilters,
} from "./accessUserSearch.js";

describe("parseEnterpriseAccessUserSearchFilters", () => {
  it("returns defaults when query params are missing", () => {
    expect(parseEnterpriseAccessUserSearchFilters({})).toEqual({
      ok: true,
      value: { scope: "all", query: null, page: 1, pageSize: 20 },
    });
  });

  it("parses scope, query, and pagination", () => {
    expect(parseEnterpriseAccessUserSearchFilters({ scope: "staff", q: "alice", page: "2", pageSize: "25" })).toEqual({
      ok: true,
      value: { scope: "staff", query: "alice", page: 2, pageSize: 25 },
    });
  });

  it("parses excludeEnrolledInModule when valid", () => {
    expect(
      parseEnterpriseAccessUserSearchFilters({ scope: "students", excludeEnrolledInModule: "42" }),
    ).toEqual({
      ok: true,
      value: { scope: "students", query: null, page: 1, pageSize: 20, excludeEnrolledInModuleId: 42 },
    });
  });

  it("rejects invalid scope and pagination", () => {
    expect(parseEnterpriseAccessUserSearchFilters({ scope: "teachers" })).toEqual({
      ok: false,
      error: "scope must be one of: staff, students, all",
    });
    expect(parseEnterpriseAccessUserSearchFilters({ page: "0" })).toEqual({
      ok: false,
      error: "page must be a positive integer",
    });
    expect(parseEnterpriseAccessUserSearchFilters({ pageSize: "101" })).toEqual({
      ok: false,
      error: "pageSize must be 100 or less",
    });
    expect(parseEnterpriseAccessUserSearchFilters({ pageSize: "-1" })).toEqual({
      ok: false,
      error: "pageSize must be a positive integer",
    });
  });

  it("rejects overly long query text", () => {
    const long = "a".repeat(121);
    expect(parseEnterpriseAccessUserSearchFilters({ q: long })).toEqual({
      ok: false,
      error: "q must be 120 characters or fewer",
    });
  });
});

describe("buildEnterpriseAccessUserSearchWhere", () => {
  it("builds scope-only filters", () => {
    expect(buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "staff", query: null })).toEqual({
      AND: [{ enterpriseId: "ent_1" }, { role: { in: ["STAFF", "ENTERPRISE_ADMIN", "ADMIN"] } }],
    });

    expect(buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "students", query: null })).toEqual({
      AND: [{ enterpriseId: "ent_1" }, { role: "STUDENT" }],
    });
  });

  it("adds query OR search conditions", () => {
    expect(buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "all", query: "12" })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        {
          OR: [
            { email: { contains: "12" } },
            { firstName: { contains: "12" } },
            { lastName: { contains: "12" } },
            { id: 12 },
          ],
        },
      ],
    });
  });

  it("returns enterprise-only filter when scope is all and query is empty", () => {
    expect(buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "all", query: null })).toEqual({
      enterpriseId: "ent_1",
    });
  });

  it("excludes users enrolled in a module when requested", () => {
    expect(
      buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "students", query: null }, { excludeEnrolledInModuleId: 7 }),
    ).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        { role: "STUDENT" },
        {
          NOT: {
            userModules: { some: { moduleId: 7, enterpriseId: "ent_1" } },
          },
        },
      ],
    });
  });
});

describe("matchesEnterpriseAccessUserSearchCandidate", () => {
  const user = {
    id: 27,
    email: "nora@example.com",
    firstName: "Nora",
    lastName: "Patel",
    active: true,
  };

  it("matches typo-tolerant names", () => {
    expect(matchesEnterpriseAccessUserSearchCandidate(user, "nra patl")).toBe(true);
  });

  it("matches exact numeric id query", () => {
    expect(matchesEnterpriseAccessUserSearchCandidate(user, "27")).toBe(true);
  });

  it("does not match unrelated query text", () => {
    expect(matchesEnterpriseAccessUserSearchCandidate(user, "database systems")).toBe(false);
  });
});
