import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MOBILE_DRAWER_PERSIST_KEY, MOBILE_DRAWER_SPACE_KEY } from "./Sidebar.constants";
import type { SidebarLink } from "./Sidebar.types";
import { useSidebarState } from "./useSidebarState";

const links: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard", space: "workspace" },
  {
    href: "/staff/projects",
    label: "Projects",
    space: "staff",
    children: [{ href: "/staff/projects/7?tab=team", label: "Team view" }],
  },
  { href: "/enterprise/modules", label: "Enterprise modules", space: "enterprise" },
];

describe("useSidebarState", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("hydrates persisted drawer state and derives matching link labels", () => {
    sessionStorage.setItem(MOBILE_DRAWER_PERSIST_KEY, "1");
    sessionStorage.setItem(MOBILE_DRAWER_SPACE_KEY, "staff");

    const { result } = renderHook(() =>
      useSidebarState({
        links,
        pathname: "/staff/projects/7",
        searchParams: new URLSearchParams("tab=team"),
      })
    );

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentSpace).toBe("staff");
    expect(result.current.resolvedMobileSpace).toBe("staff");
    expect(result.current.currentLabel).toBe("Team view");
    expect(result.current.activeVisibleHref).toBe("/staff/projects");
    expect(result.current.activeMobileVisibleHref).toBe("/staff/projects");
    expect(result.current.getGroupOpen(links[1])).toBe(true);
  });

  it("supports toggling groups and opening/closing the drawer with persisted state", () => {
    const { result } = renderHook(() =>
      useSidebarState({
        links,
        pathname: "/enterprise/modules",
        searchParams: null,
      })
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.resolvedMobileSpace).toBe("workspace");
    expect(result.current.getGroupOpen({ ...links[1], defaultExpanded: false })).toBe(false);

    act(() => {
      result.current.toggleGroup("/staff/projects", false);
    });
    expect(result.current.getGroupOpen(links[1])).toBe(true);

    act(() => {
      result.current.persistOpenState("enterprise");
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
    expect(sessionStorage.getItem(MOBILE_DRAWER_PERSIST_KEY)).toBe("1");
    expect(sessionStorage.getItem(MOBILE_DRAWER_SPACE_KEY)).toBe("enterprise");
    expect(result.current.resolvedMobileSpace).toBe("enterprise");

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
    expect(sessionStorage.getItem(MOBILE_DRAWER_PERSIST_KEY)).toBeNull();
    expect(sessionStorage.getItem(MOBILE_DRAWER_SPACE_KEY)).toBeNull();

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
  });
});
