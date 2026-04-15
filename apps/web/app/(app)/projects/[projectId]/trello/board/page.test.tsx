import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import TrelloBoardPage from "./page";

vi.mock("@/features/trello/components/TrelloProjectGate", () => ({
  TrelloProjectGate: ({
    projectId,
    signInMessage,
    children,
  }: {
    projectId: string;
    signInMessage?: string;
    children: (props: {
      projectId: string;
      teamId: number;
      teamName: string;
      teamHasLinkedTrelloBoard: boolean;
    }) => ReactNode;
  }) => (
    <div data-testid="gate" data-project-id={projectId} data-sign-in-message={signInMessage}>
      {children({
        projectId,
        teamId: 31,
        teamName: "Team Atlas",
        teamHasLinkedTrelloBoard: false,
      })}
    </div>
  ),
}));

vi.mock("@/features/trello/components/ProjectTrelloContent", () => ({
  ProjectTrelloContent: ({
    projectId,
    teamId,
    teamName,
    teamHasLinkedTrelloBoard,
    viewComponent,
  }: {
    projectId: string;
    teamId: number;
    teamName?: string;
    teamHasLinkedTrelloBoard: boolean;
    viewComponent: { name?: string };
  }) => (
    <div
      data-testid="trello-content"
      data-project-id={projectId}
      data-team-id={String(teamId)}
      data-team-name={teamName ?? ""}
      data-linked-board={String(teamHasLinkedTrelloBoard)}
      data-view-component={viewComponent.name ?? "unknown"}
    />
  ),
}));

vi.mock("@/features/trello/views/TrelloBoardView", () => ({
  TrelloBoardView: function TrelloBoardView() {
    return null;
  },
}));

describe("TrelloBoardPage", () => {
  it("renders board content through the project gate", async () => {
    const page = await TrelloBoardPage({ params: Promise.resolve({ projectId: "12" }) });
    render(page);

    expect(screen.getByTestId("gate")).toHaveAttribute("data-project-id", "12");
    expect(screen.getByTestId("gate")).toHaveAttribute(
      "data-sign-in-message",
      "Please sign in to view the board.",
    );
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-project-id", "12");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-team-id", "31");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-linked-board", "false");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-view-component", "TrelloBoardView");
  });
});
