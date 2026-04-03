import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StaffTrelloBoardPage from "./page";

vi.mock("@/features/staff/trello/StaffTrelloProjectGate", () => ({
  StaffTrelloProjectGate: ({
    projectId,
    signInMessage,
    children,
  }: {
    projectId: string;
    signInMessage: string;
    children: (args: { projectId: string; teamId: number; teamName: string }) => JSX.Element;
  }) => (
    <div data-testid="gate" data-project-id={projectId} data-sign-in-message={signInMessage}>
      {children({ projectId: "project-42", teamId: 9, teamName: "Team Delta" })}
    </div>
  ),
}));

vi.mock("@/features/staff/projects/components/StaffTeamSectionNav", () => ({
  StaffTeamSectionNav: ({ projectId, teamId }: { projectId: string; teamId: string }) => (
    <div data-testid="team-nav" data-project-id={projectId} data-team-id={teamId} />
  ),
}));

vi.mock("@/features/trello/views/TrelloBoardView", () => ({
  TrelloBoardView: function TrelloBoardView() {
    return <div data-testid="trello-board-view" />;
  },
}));

vi.mock("@/features/staff/trello/StaffProjectTrelloContent", () => ({
  StaffProjectTrelloContent: ({
    projectId,
    teamId,
    teamName,
    viewComponent,
  }: {
    projectId: string;
    teamId: number;
    teamName: string;
    viewComponent: { name?: string };
  }) => (
    <div
      data-testid="trello-content"
      data-project-id={projectId}
      data-team-id={String(teamId)}
      data-team-name={teamName}
      data-view-component={viewComponent.name ?? "unknown"}
    />
  ),
}));

describe("StaffTrelloBoardPage", () => {
  it("renders staff trello board gate and passes board view to content", async () => {
    const page = await StaffTrelloBoardPage({
      params: Promise.resolve({ projectId: "77" }),
    });

    render(page);

    expect(screen.getByTestId("gate")).toHaveAttribute("data-project-id", "77");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-sign-in-message", "Please sign in to view the board.");
    expect(screen.getByTestId("team-nav")).toHaveAttribute("data-team-id", "9");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-project-id", "project-42");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-team-name", "Team Delta");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-view-component", "TrelloBoardView");
  });
});
