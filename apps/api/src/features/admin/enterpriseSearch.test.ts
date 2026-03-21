import { describe, expect, it } from "vitest";
import {
  buildAdminEnterpriseSearchWhere,
  matchesAdminEnterpriseSearchCandidate,
  parseAdminEnterpriseSearchFilters,
} from "./enterpriseSearch.js";

describe("parseAdminEnterpriseSearchFilters", () => {
  it("returns defaults when no query params are provided", () => {
    const parsed = parseAdminEnterpriseSearchFilters({});
    expect(parsed).toEqual({
      ok: true,
      value: {
        query: null,
        page: 1,
        pageSize: 8,
      },
    });
  });

  it("parses query and pagination values", () => {
    const parsed = parseAdminEnterpriseSearchFilters({ q: "kcl", page: "2", pageSize: "25" });
    expect(parsed).toEqual({
      ok: true,
      value: {
        query: "kcl",
        page: 2,
        pageSize: 25,
      },
    });
  });

  it("rejects invalid page and pageSize", () => {
    expect(parseAdminEnterpriseSearchFilters({ page: "0" })).toEqual({
      ok: false,
      error: "page must be a positive integer",
    });
    expect(parseAdminEnterpriseSearchFilters({ pageSize: "-2" })).toEqual({
      ok: false,
      error: "pageSize must be a positive integer",
    });
    expect(parseAdminEnterpriseSearchFilters({ pageSize: "101" })).toEqual({
      ok: false,
      error: "pageSize must be 100 or less",
    });
  });

  it("rejects overly long query text", () => {
    const long = "a".repeat(121);
    expect(parseAdminEnterpriseSearchFilters({ q: long })).toEqual({
      ok: false,
      error: "q must be 120 characters or fewer",
    });
  });
});

describe("buildAdminEnterpriseSearchWhere", () => {
  it("returns empty filter when no search query is set", () => {
    expect(buildAdminEnterpriseSearchWhere({ query: null })).toEqual({});
  });

  it("builds OR query for enterprise name/code and role hints", () => {
    expect(buildAdminEnterpriseSearchWhere({ query: "admin" })).toEqual({
      OR: [
        { name: { contains: "admin" } },
        { code: { contains: "admin" } },
        { users: { some: { role: { in: ["ADMIN", "ENTERPRISE_ADMIN"] } } } },
      ],
    });
  });

  it("maps enterprise-admin role hints and keeps plain text queries lean", () => {
    expect(buildAdminEnterpriseSearchWhere({ query: "enterprise_admin" })).toEqual({
      OR: [
        { name: { contains: "enterprise_admin" } },
        { code: { contains: "enterprise_admin" } },
        { users: { some: { role: { in: ["ENTERPRISE_ADMIN"] } } } },
      ],
    });

    expect(buildAdminEnterpriseSearchWhere({ query: "kcl" })).toEqual({
      OR: [{ name: { contains: "kcl" } }, { code: { contains: "kcl" } }],
    });
  });

  it("maps student and staff role hints", () => {
    expect(buildAdminEnterpriseSearchWhere({ query: "students" })).toEqual({
      OR: [
        { name: { contains: "students" } },
        { code: { contains: "students" } },
        { users: { some: { role: { in: ["STUDENT"] } } } },
      ],
    });

    expect(buildAdminEnterpriseSearchWhere({ query: "staff" })).toEqual({
      OR: [
        { name: { contains: "staff" } },
        { code: { contains: "staff" } },
        { users: { some: { role: { in: ["STAFF"] } } } },
      ],
    });
  });
});

describe("matchesAdminEnterpriseSearchCandidate", () => {
  const enterprise = {
    id: "ent-1",
    code: "KCL001",
    name: "King's College London",
    users: [{ role: "ENTERPRISE_ADMIN" as const }],
  };

  it("matches typo-tolerant enterprise text", () => {
    expect(matchesAdminEnterpriseSearchCandidate(enterprise, "kings collge london")).toBe(true);
  });

  it("matches role-hint queries", () => {
    expect(matchesAdminEnterpriseSearchCandidate(enterprise, "enterprise admin")).toBe(true);
  });

  it("does not match unrelated query text", () => {
    expect(matchesAdminEnterpriseSearchCandidate(enterprise, "physics lab")).toBe(false);
  });
});
