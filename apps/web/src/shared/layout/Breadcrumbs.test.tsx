import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs } from "./Breadcrumbs";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("Breadcrumbs", () => {
  it("renders linked ancestors and current crumb", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Modules", href: "/enterprise/modules" },
          { label: "Edit module" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Modules" })).toHaveAttribute("href", "/enterprise/modules");
    expect(screen.getByText("Edit module")).toHaveAttribute("aria-current", "page");
  });

  it("renders non-current crumbs without href as plain text", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Section" },
          { label: "Current" },
        ]}
      />,
    );

    const section = screen.getByText("Section");
    expect(section.tagName).toBe("SPAN");
    expect(section).not.toHaveAttribute("aria-current");
    expect(screen.getAllByText("/")).toHaveLength(2);
  });
});
