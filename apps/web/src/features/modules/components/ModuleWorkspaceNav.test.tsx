import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ModuleWorkspaceNav } from "./ModuleWorkspaceNav";

const pathnameRef = { current: "/staff/modules/12" };

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.current,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className, ...rest }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

describe("ModuleWorkspaceNav", () => {
  it("marks overview active on exact module path and projects subtree on nested path", () => {
    pathnameRef.current = "/staff/modules/12";
    const { rerender } = render(<ModuleWorkspaceNav moduleId="12" basePath="/staff/modules" />);
    const overview = screen.getByRole("link", { name: "Overview" });
    expect(overview).toHaveAttribute("aria-current", "page");
    expect(overview).toHaveClass("pill-nav__link--active");

    pathnameRef.current = "/staff/modules/12/projects/3/teams/1";
    rerender(<ModuleWorkspaceNav moduleId="12" basePath="/staff/modules" />);
    const projects = screen.getByRole("link", { name: "Projects" });
    expect(projects).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "Module sections" })).toBeInTheDocument();
  });

  it("encodes module id in link hrefs and normalises basePath trailing slash", () => {
    pathnameRef.current = "/staff/modules/a%20b";
    render(<ModuleWorkspaceNav moduleId="a b" basePath="/staff/modules/" />);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/staff/modules/a%20b/manage");
  });
});
