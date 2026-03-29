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
      value: {
        scope: "students",
        query: null,
        page: 1,
        pageSize: 20,
        excludeEnrolledInModuleId: 42,
        excludeOnModuleParticipation: "all",
      },
    });
  });

  it("parses excludeOnModule lead_ta with excludeEnrolledInModule", () => {
    expect(
      parseEnterpriseAccessUserSearchFilters({
        scope: "staff_and_students",
        excludeEnrolledInModule: "7",
        excludeOnModule: "lead_ta",
      }),
    ).toEqual({
      ok: true,
      value: {
        scope: "staff_and_students",
        query: null,
        page: 1,
        pageSize: 20,
        excludeEnrolledInModuleId: 7,
        excludeOnModuleParticipation: "lead_and_ta",
      },
    });
  });

  it("parses prioritiseUserIds from a comma-separated list", () => {
    expect(parseEnterpriseAccessUserSearchFilters({ prioritiseUserIds: "3,3,5,0,-1,bad,6" })).toEqual({
      ok: true,
      value: {
        scope: "all",
        query: null,
        page: 1,
        pageSize: 20,
        prioritiseUserIds: [3, 5, 6],
      },
    });
  });

  it("rejects invalid scope and pagination", () => {
    expect(parseEnterpriseAccessUserSearchFilters({ scope: "teachers" })).toEqual({
      ok: false,
      error: "scope must be one of: staff, students, staff_and_students, all",
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
      AND: [{ enterpriseId: "ent_1" }, { role: { in: ["STAFF", "ENTERPRISE_ADMIN"] } }],
    });

    expect(buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "students", query: null })).toEqual({
      AND: [{ enterpriseId: "ent_1" }, { role: "STUDENT" }],
    });

    expect(buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "staff_and_students", query: null })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        { role: { in: ["STUDENT", "STAFF", "ENTERPRISE_ADMIN"] } },
      ],
    });
  });

  it("adds query OR search conditions", () => {
    expect(buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "all", query: "12" })).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        { NOT: { role: "ADMIN" } },
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

  it("returns enterprise tenant filter for scope all (excludes platform ADMIN role)", () => {
    expect(buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "all", query: null })).toEqual({
      AND: [{ enterpriseId: "ent_1" }, { NOT: { role: "ADMIN" } }],
    });
  });

  it("excludes users already on a module (enrolled, lead, or TA) when requested", () => {
    expect(
      buildEnterpriseAccessUserSearchWhere("ent_1", { scope: "students", query: null }, { excludeEnrolledInModuleId: 7 }),
    ).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        { role: "STUDENT" },
        {
          NOT: {
            OR: [
              {
                userModules: { some: { moduleId: 7, enterpriseId: "ent_1" } },
              },
              {
                moduleLeads: { some: { moduleId: 7 } },
              },
              {
                moduleTeachingAssistants: { some: { moduleId: 7 } },
              },
            ],
          },
        },
      ],
    });
  });

  it("excludes only module leads and TAs when excludeOnModuleParticipation is lead_and_ta", () => {
    expect(
      buildEnterpriseAccessUserSearchWhere(
        "ent_1",
        { scope: "staff_and_students", query: null },
        { excludeEnrolledInModuleId: 7, excludeOnModuleParticipation: "lead_and_ta" },
      ),
    ).toEqual({
      AND: [
        { enterpriseId: "ent_1" },
        { role: { in: ["STUDENT", "STAFF", "ENTERPRISE_ADMIN"] } },
        {
          NOT: {
            OR: [{ moduleLeads: { some: { moduleId: 7 } } }, { moduleTeachingAssistants: { some: { moduleId: 7 } } }],
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
