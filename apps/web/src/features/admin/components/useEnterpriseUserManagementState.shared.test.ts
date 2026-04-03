import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_USERS_PER_PAGE,
  normalizeUser,
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
});
