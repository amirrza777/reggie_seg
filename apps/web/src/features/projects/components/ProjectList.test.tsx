import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProjectList } from "./ProjectList";

vi.mock("next/link", () => ({
  default: ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children: ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "11",
    name: "Project Atlas",
    moduleName: "Software Engineering",
    questionnaireTemplateId: 1,
    ...overrides,
  } as any;
}

describe("ProjectList", () => {
  it("renders empty state when no projects exist", () => {
    render(<ProjectList projects={[]} />);
    expect(screen.getByText("No projects found. You haven't been assigned to any projects yet.")).toBeInTheDocument();
  });

  it("renders project card with link and summary", () => {
    render(
      <ProjectList
        projects={[project({ summary: "Build team tooling." })]}
      />,
    );

    expect(screen.getByRole("link", { name: /Project Atlas/i })).toHaveAttribute("href", "/projects/11");
    expect(screen.getByText("Module: Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("Build team tooling.")).toBeInTheDocument();
    expect(screen.getByText("View Project")).toBeInTheDocument();
  });

  it("shows archived badge and module fallback", () => {
    render(
      <ProjectList
        projects={[project({ id: "44", moduleName: "", archivedAt: "2026-01-01T00:00:00.000Z" })]}
      />,
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("Module: Module not assigned")).toBeInTheDocument();
  });

  it("renders final mark with integer and decimal formatting", () => {
    render(
      <ProjectList
        projects={[project({ id: "77" }), project({ id: "78", name: "Project Nova" })]}
        projectMetaById={{
          "77": { state: "completed_marked", mark: 72 },
          "78": { state: "completed_marked", mark: 72.5 },
        }}
      />,
    );

    expect(screen.getByText("Final mark: 72%")).toBeInTheDocument();
    expect(screen.getByText("Final mark: 72.5%")).toBeInTheDocument();
  });

  it("shows pending and awaiting-mark states", () => {
    const { container } = render(
      <ProjectList
        projects={[project({ id: "81" }), project({ id: "82", name: "Project Helios" })]}
        projectMetaById={{
          "81": { state: "completed_marked", mark: null },
          "82": { state: "completed_unmarked", mark: null },
        }}
      />,
    );

    expect(screen.getByText("Final mark pending")).toBeInTheDocument();
    expect(screen.getByText("Awaiting mark")).toBeInTheDocument();
    expect(container.querySelector(".project-card--awaiting-mark")).toBeTruthy();
    expect(container.querySelector(".project-card__mark--awaiting")).toBeTruthy();
  });
});
