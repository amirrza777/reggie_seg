import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOBILE_DRAWER_PERSIST_KEY, MOBILE_DRAWER_SPACE_KEY } from "./Sidebar.constants";
import type { SidebarLink } from "../Sidebar.types";
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

  it("falls back to workspace for invalid persisted space and supports toggle-close path", () => {
    sessionStorage.setItem(MOBILE_DRAWER_PERSIST_KEY, "1");
    sessionStorage.setItem(MOBILE_DRAWER_SPACE_KEY, "unknown-space");

    const { result } = renderHook(() =>
      useSidebarState({
        links,
        pathname: "/dashboard",
        searchParams: null,
      }),
    );

    expect(result.current.isOpen).toBe(true);
    expect(result.current.resolvedMobileSpace).toBe("workspace");

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("ignores storage failures when persisting and clearing drawer state", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("set blocked");
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("remove blocked");
    });

    const { result } = renderHook(() =>
      useSidebarState({
        links,
        pathname: "/staff/projects",
        searchParams: null,
      }),
    );

    expect(() => {
      act(() => {
        result.current.persistOpenState("staff");
        result.current.close();
      });
    }).not.toThrow();

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it("returns inactive groups as closed when no explicit/default state is provided", () => {
    const { result } = renderHook(() =>
      useSidebarState({
        links,
        pathname: "/dashboard",
        searchParams: null,
      }),
    );

    expect(result.current.getGroupOpen({ href: "/plain", label: "Plain link" } as SidebarLink)).toBe(false);
  });

  it("falls back safely when reading persisted drawer state throws", () => {
    const sessionStorageGetterSpy = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    const { result } = renderHook(() =>
      useSidebarState({
        links,
        pathname: "/staff/projects",
        searchParams: null,
      }),
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.resolvedMobileSpace).toBe("workspace");

    expect(() => {
      act(() => {
        result.current.persistOpenState("staff");
        result.current.close();
      });
    }).not.toThrow();

    sessionStorageGetterSpy.mockRestore();
  });
});
