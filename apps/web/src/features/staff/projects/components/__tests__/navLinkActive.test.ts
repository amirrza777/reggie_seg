import { describe, expect, it } from "vitest";
import { isStaffNavLinkActive } from "../navLinkActive";

describe("isStaffNavLinkActive", () => {
  it("returns false when pathname is missing", () => {
    expect(
      isStaffNavLinkActive({
        pathname: null,
        baseHref: "/staff/projects/1",
        href: "/staff/projects/1/team",
        isOverview: false,
      }),
    ).toBe(false);
  });

  it("matches overview links by exact base href", () => {
    expect(
      isStaffNavLinkActive({
        pathname: "/staff/projects/1",
        baseHref: "/staff/projects/1",
        href: "/staff/projects/1/team",
        isOverview: true,
      }),
    ).toBe(true);
  });

  it("matches section links by exact href or nested path", () => {
    expect(
      isStaffNavLinkActive({
        pathname: "/staff/projects/1/team",
        baseHref: "/staff/projects/1",
        href: "/staff/projects/1/team",
        isOverview: false,
      }),
    ).toBe(true);

    expect(
      isStaffNavLinkActive({
        pathname: "/staff/projects/1/team/member/2",
        baseHref: "/staff/projects/1",
        href: "/staff/projects/1/team",
        isOverview: false,
      }),
    ).toBe(true);
  });
});
