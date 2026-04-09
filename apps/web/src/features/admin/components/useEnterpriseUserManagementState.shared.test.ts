import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENTERPRISE_USER_SORT_VALUE,
  ENTERPRISE_USERS_PER_PAGE,
  normalizeUser,
  resolveEnterpriseUserSortParams,
  resolveUnknownError,
} from "./useEnterpriseUserManagementState.shared";

describe("useEnterpriseUserManagementState.shared", () => {
  it("normalizes user role and active state defaults", () => {
    const normalizedStudent = normalizeUser({
      id: 1,
      email: "student@example.com",
      firstName: "Student",
      lastName: "One",
      isStaff: false,
    });
    expect(normalizedStudent.role).toBe("STUDENT");
    expect(normalizedStudent.active).toBe(true);

    const normalizedStaff = normalizeUser({
      id: 2,
      email: "staff@example.com",
      firstName: "Staff",
      lastName: "One",
      isStaff: true,
    });
    expect(normalizedStaff.role).toBe("STAFF");
    expect(normalizedStaff.active).toBe(true);
  });

  it("preserves explicit role and active values", () => {
    const normalized = normalizeUser({
      id: 9,
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      isStaff: true,
      role: "ENTERPRISE_ADMIN",
      active: false,
    });

    expect(normalized.role).toBe("ENTERPRISE_ADMIN");
    expect(normalized.active).toBe(false);
    expect(ENTERPRISE_USERS_PER_PAGE).toBe(10);
  });

  it("resolves unknown errors to fallback messages", () => {
    expect(resolveUnknownError(new Error("Boom"), "Fallback")).toBe("Boom");
    expect(resolveUnknownError("unexpected", "Fallback")).toBe("Fallback");
  });

  it("resolves enterprise user sort params", () => {
    expect(DEFAULT_ENTERPRISE_USER_SORT_VALUE).toBe("default");
    expect(resolveEnterpriseUserSortParams("default")).toEqual({});
    expect(resolveEnterpriseUserSortParams("joinDateDesc")).toEqual({ sortBy: "joinDate", sortDirection: "desc" });
    expect(resolveEnterpriseUserSortParams("joinDateAsc")).toEqual({ sortBy: "joinDate", sortDirection: "asc" });
    expect(resolveEnterpriseUserSortParams("nameAsc")).toEqual({ sortBy: "name", sortDirection: "asc" });
    expect(resolveEnterpriseUserSortParams("nameDesc")).toEqual({ sortBy: "name", sortDirection: "desc" });
  });
});
