import { describe, it, expect } from "vitest";
import { isStaffRole } from "./roles.js";

describe("isStaffRole", () => {
  it("returns true for STAFF", () => {
    expect(isStaffRole("STAFF")).toBe(true);
  });

  it("returns true for ADMIN", () => {
    expect(isStaffRole("ADMIN")).toBe(true);
  });

  it("returns true for ENTERPRISE_ADMIN", () => {
    expect(isStaffRole("ENTERPRISE_ADMIN")).toBe(true);
  });

  it("returns false for STUDENT", () => {
    expect(isStaffRole("STUDENT")).toBe(false);
  });
});
