import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname, useSearchParams } from "next/navigation";
import { useSidebarState } from "./useSidebarState";
import { Sidebar } from "./Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("./useSidebarState", () => ({
  useSidebarState: vi.fn(),
}));

vi.mock("./SidebarMobileNav", () => ({
  SidebarMobileNav: ({ title, isOpen }: { title: string; isOpen: boolean }) => (
    <div data-testid="mobile-nav" data-title={title} data-open={String(isOpen)} />
  ),
}));

vi.mock("./SidebarDesktopNav", () => ({
  SidebarDesktopNav: ({ links, activeVisibleHref }: { links: unknown[]; activeVisibleHref: string | null }) => (
    <div data-testid="desktop-nav" data-link-count={links.length} data-active={activeVisibleHref ?? ""} />
  ),
}));

const usePathnameMock = vi.mocked(usePathname);
const useSearchParamsMock = vi.mocked(useSearchParams);
const useSidebarStateMock = vi.mocked(useSidebarState);

const stateValue = {
  activeMobileVisibleHref: "/staff/projects",
  activeVisibleHref: "/staff/projects",
  availableSpaces: [{ key: "staff", label: "Staff" }],
  close: vi.fn(),
  currentLabel: "Projects",
  getGroupOpen: vi.fn(() => true),
  isOpen: false,
  mobileVisibleLinks: [{ href: "/staff/projects", label: "Projects" }],
  persistOpenState: vi.fn(),
  resolvedMobileSpace: "staff",
  setMobileSpace: vi.fn(),
  toggle: vi.fn(),
  toggleGroup: vi.fn(),
  visibleLinks: [{ href: "/staff/projects", label: "Projects" }],
};

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/staff/projects");
    useSearchParamsMock.mockReturnValue(new URLSearchParams("tab=all"));
    useSidebarStateMock.mockReturnValue(stateValue as ReturnType<typeof useSidebarState>);
  });

  it("renders both mobile and desktop sections in full mode, including desktop footer", () => {
    render(
      <Sidebar
        title="Staff nav"
        links={[{ href: "/staff/projects", label: "Projects" }]}
        footer={<div data-testid="sidebar-footer">footer</div>}
        mode="full"
      />
    );

    const root = screen.getByTestId("mobile-nav").closest(".sidebar");
    expect(root).toHaveClass("sidebar");
    expect(screen.getByTestId("mobile-nav")).toHaveAttribute("data-title", "Staff nav");
    expect(screen.getByTestId("desktop-nav")).toHaveAttribute("data-link-count", "1");
    expect(screen.getByTestId("sidebar-footer")).toBeInTheDocument();
    expect(useSidebarStateMock).toHaveBeenCalledWith({
      links: [{ href: "/staff/projects", label: "Projects" }],
      pathname: "/staff/projects",
      searchParams: new URLSearchParams("tab=all"),
    });
  });

  it("renders only mobile nav in mobile mode", () => {
    render(<Sidebar links={[{ href: "/staff/projects", label: "Projects" }]} mode="mobile" />);

    const root = screen.getByTestId("mobile-nav").closest(".sidebar");
    expect(root).toHaveClass("sidebar", "sidebar--mobile-only");
    expect(screen.queryByTestId("desktop-nav")).not.toBeInTheDocument();
  });

  it("renders only desktop nav in desktop mode", () => {
    render(
      <Sidebar
        links={[{ href: "/staff/projects", label: "Projects" }]}
        mode="desktop"
        footer={<div data-testid="footer-slot">footer</div>}
      />
    );

    const desktop = screen.getByTestId("desktop-nav");
    const root = desktop.closest(".sidebar");
    expect(root).toHaveClass("sidebar", "sidebar--desktop-only");
    expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
    expect(screen.getByTestId("footer-slot")).toBeInTheDocument();
  });
});
