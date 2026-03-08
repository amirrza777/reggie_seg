import { describe, expect, it } from "vitest";
import { buildAdminUserSearchWhere, parseAdminUserSearchFilters } from "./userSearch.js";

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
});

