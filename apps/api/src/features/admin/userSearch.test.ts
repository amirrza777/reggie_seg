import { describe, expect, it } from "vitest";
import { buildAdminUserSearchWhere, matchesAdminUserSearchCandidate, parseAdminUserSearchFilters } from "./userSearch.js";

describe("parseAdminUserSearchFilters", () => {
  it("returns defaults when query params are not provided", () => {
    const parsed = parseAdminUserSearchFilters({});
    expect(parsed).toEqual({
      ok: true,
      value: {
        query: null,
        role: null,
        active: null,
        page: 1,
        pageSize: 25,
      },
    });
  });

  it("parses filters and pagination values", () => {
    const parsed = parseAdminUserSearchFilters({
      q: "kcl",
      role: "staff",
      active: "false",
      page: "3",
      pageSize: "50",
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        query: "kcl",
        role: "STAFF",
        active: false,
        page: 3,
        pageSize: 50,
      },
    });
  });

  it("parses active=true via numeric shorthand", () => {
    const parsed = parseAdminUserSearchFilters({ active: "1" });
    expect(parsed).toEqual({
      ok: true,
      value: {
        query: null,
        role: null,
        active: true,
        page: 1,
        pageSize: 25,
      },
    });
  });

  it("rejects invalid role filter", () => {
    const parsed = parseAdminUserSearchFilters({ role: "owner" });
    expect(parsed).toEqual({ ok: false, error: "Invalid role filter" });
  });

  it("rejects invalid active filter", () => {
    const parsed = parseAdminUserSearchFilters({ active: "yes" });
    expect(parsed).toEqual({ ok: false, error: "active must be true or false" });
  });

  it("rejects invalid page and pageSize", () => {
    expect(parseAdminUserSearchFilters({ page: "0" })).toEqual({
      ok: false,
      error: "page must be a positive integer",
    });
    expect(parseAdminUserSearchFilters({ pageSize: "-2" })).toEqual({
      ok: false,
      error: "pageSize must be a positive integer",
    });
    expect(parseAdminUserSearchFilters({ pageSize: "101" })).toEqual({
      ok: false,
      error: "pageSize must be 100 or less",
    });
  });

  it("rejects overly long query text", () => {
    const long = "a".repeat(121);
    expect(parseAdminUserSearchFilters({ q: long })).toEqual({
      ok: false,
      error: "q must be 120 characters or fewer",
    });
  });
});

describe("buildAdminUserSearchWhere", () => {
  it("returns enterprise-only filter when no search params are set", () => {
    expect(buildAdminUserSearchWhere("ent_1", { query: null, role: null, active: null })).toEqual({
      enterpriseId: "ent_1",
    });
  });

  it("builds OR search filters with role/active clauses", () => {
    expect(buildAdminUserSearchWhere("ent_1", { query: "12", role: "STUDENT", active: true })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        { role: "STUDENT" },
        { active: true },
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

  it("maps role and status query hints into OR conditions", () => {
    expect(buildAdminUserSearchWhere("ent_1", { query: "staff", role: null, active: null })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        {
          OR: [
            { email: { contains: "staff" } },
            { firstName: { contains: "staff" } },
            { lastName: { contains: "staff" } },
            { role: "STAFF" },
          ],
        },
      ],
    });

    expect(buildAdminUserSearchWhere("ent_1", { query: "suspended", role: null, active: null })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        {
          OR: [
            { email: { contains: "suspended" } },
            { firstName: { contains: "suspended" } },
            { lastName: { contains: "suspended" } },
            { active: false },
          ],
        },
      ],
    });
  });

  it("maps enterprise-admin query hints", () => {
    expect(buildAdminUserSearchWhere("ent_1", { query: "enterprise-admin", role: null, active: null })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        {
          OR: [
            { email: { contains: "enterprise-admin" } },
            { firstName: { contains: "enterprise-admin" } },
            { lastName: { contains: "enterprise-admin" } },
            { role: "ENTERPRISE_ADMIN" },
          ],
        },
      ],
    });
  });

  it("maps student role query hints", () => {
    expect(buildAdminUserSearchWhere("ent_1", { query: "students", role: null, active: null })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        {
          OR: [
            { email: { contains: "students" } },
            { firstName: { contains: "students" } },
            { lastName: { contains: "students" } },
            { role: "STUDENT" },
          ],
        },
      ],
    });
  });

  it("maps admin role query hints", () => {
    expect(buildAdminUserSearchWhere("ent_1", { query: "admin", role: null, active: null })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        {
          OR: [
            { email: { contains: "admin" } },
            { firstName: { contains: "admin" } },
            { lastName: { contains: "admin" } },
            { role: "ADMIN" },
          ],
        },
      ],
    });
  });

  it("maps active-status query hints", () => {
    expect(buildAdminUserSearchWhere("ent_1", { query: "active", role: null, active: null })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        {
          OR: [
            { email: { contains: "active" } },
            { firstName: { contains: "active" } },
            { lastName: { contains: "active" } },
            { active: true },
          ],
        },
      ],
    });
  });
});

describe("matchesAdminUserSearchCandidate", () => {
  const user = {
    id: 12,
    email: "alice@kcl.ac.uk",
    firstName: "Alice",
    lastName: "Nguyen",
    role: "STAFF",
    active: false,
  };

  it("matches typo-tolerant name queries", () => {
    expect(matchesAdminUserSearchCandidate(user, "alce nguyn")).toBe(true);
  });

  it("matches role and status hints", () => {
    expect(matchesAdminUserSearchCandidate(user, "staff")).toBe(true);
    expect(matchesAdminUserSearchCandidate(user, "inactive")).toBe(true);
  });

  it("matches exact numeric id query", () => {
    expect(matchesAdminUserSearchCandidate(user, "12")).toBe(true);
  });

  it("does not match unrelated query text", () => {
    expect(matchesAdminUserSearchCandidate(user, "quantum mechanics")).toBe(false);
  });
});
