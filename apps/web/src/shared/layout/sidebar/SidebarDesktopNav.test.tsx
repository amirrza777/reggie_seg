import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SidebarDesktopNav } from "./SidebarDesktopNav";

vi.mock("next/link", () => ({
  default: ({ href, className, children, ...rest }: { href: string; className?: string; children: ReactNode }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

describe("SidebarDesktopNav", () => {
  it("renders single links and marks active links", () => {
    render(
      <SidebarDesktopNav
        links={[{ href: "/staff/projects", label: "Projects" }]}
        activeVisibleHref="/staff/projects"
        pathname="/staff/projects"
        searchParams={new URLSearchParams()}
        getGroupOpen={() => false}
        toggleGroup={() => undefined}
      />,
    );

    const link = screen.getByRole("link", { name: "Projects" });
    expect(link).toHaveAttribute("href", "/staff/projects");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.className).toContain("is-active");
  });

  it("renders group links, resolves active child, and toggles groups", () => {
    const toggleGroup = vi.fn();

    render(
      <SidebarDesktopNav
        links={[
          {
            href: "/staff/teams",
            label: "Teams",
            children: [
              { href: "/staff/teams/a", label: "Alpha" },
              { href: "/staff/teams/b?tab=metrics", label: "Beta metrics" },
            ],
          },
        ]}
        activeVisibleHref={null}
        pathname="/staff/teams/b"
        searchParams={new URLSearchParams("tab=metrics")}
        getGroupOpen={() => true}
        toggleGroup={toggleGroup}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Teams" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger.className).toContain("is-active");

    const activeChild = screen.getByRole("link", { name: "Beta metrics" });
    expect(activeChild).toHaveAttribute("aria-current", "page");

    fireEvent.click(trigger);
    expect(toggleGroup).toHaveBeenCalledWith("/staff/teams", true);
  });

  it("makes child links unfocusable when group is closed", () => {
    render(
      <SidebarDesktopNav
        links={[
          {
            href: "/staff/teams",
            label: "Teams",
            children: [{ href: "/staff/teams/a", label: "Alpha" }],
          },
        ]}
        activeVisibleHref={null}
        pathname="/staff/teams/a"
        searchParams={new URLSearchParams()}
        getGroupOpen={() => false}
        toggleGroup={() => undefined}
      />,
    );

    const child = screen.getByRole("link", { name: "Alpha", hidden: true });
    expect(child).toHaveAttribute("tabindex", "-1");
  });

  it("renders inactive links/groups without active aria markers", () => {
    render(
      <SidebarDesktopNav
        links={[
          { href: "/staff/home", label: "Home" },
          {
            href: "/staff/group",
            label: "Group",
            children: [{ href: "/staff/group/a", label: "A" }],
          },
        ]}
        activeVisibleHref={null}
        pathname="/staff/elsewhere"
        searchParams={new URLSearchParams()}
        getGroupOpen={() => true}
        toggleGroup={() => undefined}
      />,
    );

    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Group" }).className).not.toContain("is-active");
    const child = screen.getByRole("link", { name: "A" });
    expect(child).not.toHaveAttribute("aria-current");
    expect(child).toHaveStyle({ "--dropdown-item-index": "0" });
    expect(child).not.toHaveAttribute("tabindex");
  });
});
