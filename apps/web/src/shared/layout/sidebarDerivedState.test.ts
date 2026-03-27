import { describe, expect, it } from "vitest";
import type { SidebarLink } from "./Sidebar.types";
import { computeSidebarDerivedState } from "./sidebarDerivedState";

const baseLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard", space: "workspace" },
  {
    href: "/staff/projects",
    label: "Projects",
    space: "staff",
    children: [
      { href: "/staff/projects/42?tab=overview", label: "Overview" },
      { href: "/staff/projects/42?tab=team", label: "Team" },
    ],
  },
  { href: "/enterprise/modules", label: "Modules", space: "enterprise" },
];

describe("computeSidebarDerivedState", () => {
  it("derives active space, visible links, and current label from the best matching link", () => {
    const state = computeSidebarDerivedState({
      links: baseLinks,
      pathname: "/staff/projects/42",
      searchParams: new URLSearchParams("tab=overview"),
      mobileSpace: "admin",
    });

    expect(state.currentSpace).toBe("staff");
    expect(state.availableSpaces.map((space) => space.key)).toEqual(["workspace", "staff", "enterprise"]);
    expect(state.resolvedMobileSpace).toBe("staff");
    expect(state.visibleLinks.map((link) => link.href)).toEqual(["/staff/projects"]);
    expect(state.mobileVisibleLinks.map((link) => link.href)).toEqual(["/staff/projects"]);
    expect(state.activeVisibleHref).toBe("/staff/projects");
    expect(state.activeMobileVisibleHref).toBe("/staff/projects");
    expect(state.currentLabel).toBe("Overview");
  });

  it("uses selected mobile space when available and falls back to first visible label", () => {
    const state = computeSidebarDerivedState({
      links: baseLinks,
      pathname: "/enterprise/unknown",
      searchParams: null,
      mobileSpace: "workspace",
    });

    expect(state.currentSpace).toBe("enterprise");
    expect(state.resolvedMobileSpace).toBe("workspace");
    expect(state.visibleLinks.map((link) => link.href)).toEqual(["/enterprise/modules"]);
    expect(state.mobileVisibleLinks.map((link) => link.href)).toEqual(["/dashboard"]);
    expect(state.activeVisibleHref).toBe(null);
    expect(state.activeMobileVisibleHref).toBe(null);
    expect(state.currentLabel).toBe("Modules");
  });

  it("falls back to workspace defaults when pathname is missing", () => {
    const state = computeSidebarDerivedState({
      links: [],
      pathname: null,
      searchParams: null,
      mobileSpace: "admin",
    });

    expect(state.currentSpace).toBe("workspace");
    expect(state.availableSpaces).toEqual([]);
    expect(state.resolvedMobileSpace).toBe("workspace");
    expect(state.visibleLinks).toEqual([]);
    expect(state.mobileVisibleLinks).toEqual([]);
    expect(state.currentLabel).toBe("Menu");
  });
});
