import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectTeamList } from "./ProjectTeamList";

function team(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    teamName: "Team Alpha",
    projectId: 42,
    createdAt: "2026-01-01T00:00:00.000Z",
    inactivityFlag: "NONE",
    allocations: [],
    ...overrides,
  } as any;
}

describe("ProjectTeamList", () => {
  it("renders empty state when team has no allocations", () => {
    render(<ProjectTeamList team={team()} />);
    expect(screen.getByText("No teammates found for this project team.")).toBeInTheDocument();
  });

  it("falls back safely when allocations is undefined", () => {
    render(<ProjectTeamList team={team({ allocations: undefined })} />);
    expect(screen.getByText("No teammates found for this project team.")).toBeInTheDocument();
  });

  it("sorts teammates alphabetically and renders full details", () => {
    render(
      <ProjectTeamList
        team={team({
          allocations: [
            { userId: 2, user: { firstName: "Zoe", lastName: "Able", email: "zoe@example.com" } },
            { userId: 3, user: { firstName: "Amy", lastName: "Baker", email: "amy@example.com" } },
          ],
        })}
      />,
    );

    const names = screen.getAllByText(/.+/, { selector: ".project-team-list__name" }).map((node) => node.textContent);
    expect(names).toEqual(["Amy Baker", "Zoe Able"]);
    expect(screen.getByText("amy@example.com")).toBeInTheDocument();
    expect(screen.getByText("zoe@example.com")).toBeInTheDocument();
    expect(screen.getByText("AB")).toBeInTheDocument();
    expect(screen.getByText("ZA")).toBeInTheDocument();
  });

  it("falls back to email and '?' initials when names are missing", () => {
    render(
      <ProjectTeamList
        team={team({
          allocations: [
            { userId: 8, user: { firstName: " ", lastName: "", email: "anon@example.com" } },
          ],
        })}
      />,
    );

    expect(screen.getAllByText("anon@example.com")).toHaveLength(2);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
