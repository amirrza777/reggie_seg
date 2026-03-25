import { describe, expect, it } from "vitest";
import { getBestMatchingHref, getSpaceFromHref, isHrefActive, normalizePath } from "./Sidebar.utils";

describe("Sidebar.utils", () => {
  it("normalizes trailing slashes", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/staff/")).toBe("/staff");
    expect(normalizePath("/staff///")).toBe("/staff");
  });

  it("matches hrefs with optional query requirements", () => {
    const params = new URLSearchParams("tab=overview&space=staff");
    expect(isHrefActive("/staff", "/staff/modules", params)).toBe(true);
    expect(isHrefActive("/staff?tab=overview", "/staff", params)).toBe(true);
    expect(isHrefActive("/staff?tab=metrics", "/staff", params)).toBe(false);
    expect(isHrefActive("/staff?tab=overview", "/staff", null)).toBe(false);
    expect(isHrefActive("/enterprise", "/staff", params)).toBe(false);
    expect(isHrefActive("/staff", null, params)).toBe(false);
  });

  it("picks the most specific matching href", () => {
    const targets = [
      { href: "/staff" },
      { href: "/staff/modules" },
      { href: "/staff/modules?tab=overview" },
    ];
    const params = new URLSearchParams("tab=overview");
    expect(getBestMatchingHref(targets, "/staff/modules", params)).toBe("/staff/modules?tab=overview");
    expect(getBestMatchingHref(targets, "/admin", params)).toBeNull();
  });

  it("derives space from href", () => {
    expect(getSpaceFromHref("/enterprise/modules")).toBe("enterprise");
    expect(getSpaceFromHref("/admin/users")).toBe("admin");
    expect(getSpaceFromHref("/staff/dashboard")).toBe("staff");
    expect(getSpaceFromHref("/dashboard")).toBe("workspace");
  });
});
