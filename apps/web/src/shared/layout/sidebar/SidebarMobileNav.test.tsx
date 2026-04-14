import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MobileSpaceLink, SidebarLink } from "../Sidebar.types";
import { SidebarMobileNav } from "./SidebarMobileNav";

vi.mock("next/link", () => ({
  default: ({ href, className, children, onClick, ...rest }: {
    href: string;
    className?: string;
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

const links: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  {
    href: "/staff/projects",
    label: "Projects",
    children: [
      { href: "/staff/projects/7?tab=overview", label: "Overview" },
      { href: "/staff/projects/7?tab=team", label: "Team" },
    ],
  },
];

function makeProps(overrides: Partial<Parameters<typeof SidebarMobileNav>[0]> = {}): Parameters<typeof SidebarMobileNav>[0] {
  return {
    mode: "full",
    title: "Staff navigation",
    isOpen: false,
    currentLabel: "Projects",
    close: vi.fn(),
    toggle: vi.fn(),
    mobileSpaces: [{ href: "/dashboard", label: "Workspace" }],
    pathname: "/staff/projects/7",
    availableSpaces: [
      { key: "workspace", label: "Workspace" },
      { key: "staff", label: "Staff" },
    ],
    resolvedMobileSpace: "workspace",
    setMobileSpace: vi.fn(),
    persistOpenState: vi.fn(),
    mobileVisibleLinks: links,
    activeMobileVisibleHref: "/staff/projects",
    getGroupOpen: vi.fn((link: SidebarLink) => link.href === "/staff/projects"),
    toggleGroup: vi.fn(),
    searchParams: new URLSearchParams("tab=team"),
    ...overrides,
  };
}

describe("SidebarMobileNav", () => {
  it("renders trigger variants for full and mobile modes", () => {
    const fullProps = makeProps();
    const { rerender } = render(<SidebarMobileNav {...fullProps} />);

    const fullTrigger = screen.getByRole("button", { name: /Projects/ });
    expect(fullTrigger).toHaveAttribute("aria-expanded", "false");
    expect(fullTrigger).toHaveTextContent("Projects");
    expect(fullTrigger.className).not.toContain("sidebar__mobile-trigger--icon");
    fireEvent.click(fullTrigger);
    expect(fullProps.toggle).toHaveBeenCalledTimes(1);

    const mobileProps = makeProps({ mode: "mobile", isOpen: true });
    rerender(<SidebarMobileNav {...mobileProps} />);

    const mobileTrigger = screen.getByRole("button", { name: "Open navigation menu" });
    expect(mobileTrigger).toHaveTextContent("Menu");
    expect(mobileTrigger.className).toContain("sidebar__mobile-trigger--icon");
    expect(screen.queryByText("Projects", { selector: ".sidebar__mobile-trigger-label" })).not.toBeInTheDocument();
  });

  it("supports drawer close interactions and single-link close behavior", () => {
    const props = makeProps({ isOpen: true, activeMobileVisibleHref: "/dashboard" });
    const { container } = render(<SidebarMobileNav {...props} />);

    const sheet = container.querySelector("#sidebar-mobile-menu");
    expect(sheet).toBeInTheDocument();
    fireEvent.click(sheet as Element);
    expect(props.close).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog"));
    expect(props.close).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(props.close).toHaveBeenCalledTimes(2);
  });

  it("renders linked mobile spaces when multiple space links exist", () => {
    const mobileSpaces: MobileSpaceLink[] = [
      { href: "/staff/projects", label: "Staff", activePaths: ["/staff/modules"] },
      { href: "/enterprise/users", label: "Enterprise" },
    ];
    const props = makeProps({
      isOpen: true,
      pathname: "/staff/modules/14",
      mobileSpaces,
      availableSpaces: [{ key: "workspace", label: "Workspace" }],
    });
    render(<SidebarMobileNav {...props} />);

    const staffSpace = screen.getByRole("link", { name: "Staff" });
    const enterpriseSpace = screen.getByRole("link", { name: "Enterprise" });
    expect(staffSpace.className).toContain("is-active");

    fireEvent.click(enterpriseSpace);
    expect(props.setMobileSpace).toHaveBeenCalledWith("enterprise");
    expect(props.persistOpenState).toHaveBeenCalledWith("enterprise");
  });

  it("renders tabbed spaces when there are multiple available spaces but one mobile space link", () => {
    const props = makeProps({
      isOpen: true,
      availableSpaces: [
        { key: "workspace", label: "Workspace" },
        { key: "staff", label: "Staff" },
      ],
      resolvedMobileSpace: "workspace",
      mobileSpaces: [{ href: "/dashboard", label: "Workspace" }],
    });
    render(<SidebarMobileNav {...props} />);

    const workspaceTab = screen.getByRole("tab", { name: "Workspace" });
    const staffTab = screen.getByRole("tab", { name: "Staff" });
    expect(workspaceTab).toHaveAttribute("aria-selected", "true");
    expect(staffTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(staffTab);
    expect(props.setMobileSpace).toHaveBeenCalledWith("staff");
  });

  it("renders grouped links with active child matching and closed tab-index fallback", () => {
    const props = makeProps({ isOpen: true });
    const { rerender } = render(<SidebarMobileNav {...props} />);

    const groupTrigger = screen
      .getAllByRole("button", { name: "Projects" })
      .find((button) => button.className.includes("sidebar__mobile-group-trigger"));
    expect(groupTrigger).toBeTruthy();
    expect(groupTrigger).toHaveAttribute("aria-expanded", "true");
    expect(groupTrigger?.className).toContain("is-active");

    fireEvent.click(groupTrigger as HTMLButtonElement);
    expect(props.toggleGroup).toHaveBeenCalledWith("/staff/projects", true);

    const activeChild = screen.getByRole("link", { name: "Team" });
    expect(activeChild.className).toContain("is-active");
    expect(activeChild.getAttribute("tabindex")).toBeNull();
    fireEvent.click(activeChild);
    expect(props.close).toHaveBeenCalledTimes(1);

    const closedProps = makeProps({
      isOpen: true,
      activeMobileVisibleHref: null,
      getGroupOpen: vi.fn(() => false),
      pathname: "/staff/projects/7",
      searchParams: new URLSearchParams("tab=overview"),
    });
    rerender(<SidebarMobileNav {...closedProps} />);

    const closedGroupTrigger = screen
      .getAllByRole("button", { name: "Projects" })
      .find((button) => button.className.includes("sidebar__mobile-group-trigger"));
    expect(closedGroupTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Overview", hidden: true })).toHaveAttribute("tabindex", "-1");
    expect(document.querySelector(".sidebar__mobile-group-collapse")).toHaveAttribute("aria-hidden", "true");
  });
});
