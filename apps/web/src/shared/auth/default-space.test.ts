import { describe, expect, it } from "vitest";
import { getDefaultSpaceOverviewPath } from "./default-space";

describe("getDefaultSpaceOverviewPath", () => {
  it("routes admins to admin overview", () => {
    expect(getDefaultSpaceOverviewPath({ role: "ADMIN" })).toBe("/admin");
  });

  it("routes enterprise admins to enterprise overview", () => {
    expect(getDefaultSpaceOverviewPath({ role: "ENTERPRISE_ADMIN" })).toBe("/enterprise");
  });

  it("routes staff users to staff overview", () => {
    expect(getDefaultSpaceOverviewPath({ role: "STAFF" })).toBe("/staff/dashboard");
    expect(getDefaultSpaceOverviewPath({ role: "STUDENT", isStaff: true })).toBe("/staff/dashboard");
  });

  it("routes students to workspace overview", () => {
    expect(getDefaultSpaceOverviewPath({ role: "STUDENT" })).toBe("/dashboard");
  });

  it("routes unassigned accounts to workspace holding view", () => {
    expect(getDefaultSpaceOverviewPath({ role: "ADMIN", isUnassigned: true })).toBe("/dashboard");
    expect(getDefaultSpaceOverviewPath({ role: "STUDENT", isUnassigned: true })).toBe("/dashboard");
  });
});
