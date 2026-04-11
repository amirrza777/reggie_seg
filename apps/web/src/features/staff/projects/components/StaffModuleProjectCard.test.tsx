import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { StaffModuleProjectCard, StaffModuleProjectCardList } from "./StaffModuleProjectCard";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const project = {
  id: 9,
  name: "Alpha Project",
  teamCount: 2,
  hasGithubRepo: true,
  membersTotal: 8,
  membersConnected: 5,
  visibleTeams: [
    {
      id: 1,
      teamName: "Alpha Team",
      memberCount: 3,
      hasRepo: true,
      trelloBoardId: "board_1",
    },
    {
      id: 2,
      teamName: "Beta Team",
      memberCount: 2,
      hasRepo: false,
      trelloBoardId: null,
    },
  ],
  teamFetchFailed: false,
};

describe("StaffModuleProjectCard", () => {
  it("renders project and team links, with query highlights", () => {
    const { container } = render(
      <StaffModuleProjectCard
        project={project}
        hasQuery
        rawQuery="alpha"
      />,
    );

    expect(screen.getByRole("link", { name: "Open project" })).toHaveAttribute("href", "/staff/projects/9");
    expect(screen.getByRole("link", { name: "Team allocation" })).toHaveAttribute("href", "/staff/projects/9/team-allocation");
    expect(screen.getByRole("link", { name: /Alpha Team/i })).toHaveAttribute("href", "/staff/projects/9/teams/1");
    expect(screen.getByText("✓ GitHub connected")).toBeInTheDocument();
    expect(screen.getByText("⚠ No GitHub repo")).toBeInTheDocument();
    expect(screen.getByText("✓ Trello board linked")).toBeInTheDocument();
    expect(screen.getByText("⚠ No Trello board")).toBeInTheDocument();

    const details = container.querySelector("details");
    expect(details).toHaveAttribute("open");
    expect(container.querySelectorAll("mark.staff-projects__search-hit").length).toBeGreaterThan(0);
  });

  it("shows empty-state and fetch-failed messages for teams", () => {
    const { rerender } = render(
      <StaffModuleProjectCard
        project={{ ...project, visibleTeams: [], teamFetchFailed: false }}
        hasQuery={false}
        rawQuery={undefined}
      />,
    );

    expect(screen.getByText("No teams in this project yet.")).toBeInTheDocument();

    rerender(
      <StaffModuleProjectCard
        project={{ ...project, visibleTeams: [], teamFetchFailed: true }}
        hasQuery={false}
        rawQuery={undefined}
      />,
    );

    expect(screen.getByText("Could not load teams right now.")).toBeInTheDocument();
  });

  it("renders a list wrapper with multiple cards", () => {
    render(
      <StaffModuleProjectCardList
        projects={[project, { ...project, id: 10, name: "Beta Project" }]}
        hasQuery={false}
        rawQuery={undefined}
      />,
    );

    expect(screen.getByRole("region", { name: "Projects in this module" })).toBeInTheDocument();
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Beta Project")).toBeInTheDocument();
  });
});
