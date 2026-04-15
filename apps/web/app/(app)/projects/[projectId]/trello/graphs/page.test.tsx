import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrelloGraphsPage from "./page";

type GateState = {
  teamId: number;
  teamName: string;
  teamHasLinkedTrelloBoard: boolean;
  deadline: Record<string, unknown> | null;
};

const gateState: GateState = {
  teamId: 12,
  teamName: "Team Delta",
  teamHasLinkedTrelloBoard: true,
  deadline: null,
};

vi.mock("@/features/trello/components/TrelloProjectGate", () => ({
  TrelloProjectGate: ({
    projectId,
    needDeadline,
    signInMessage,
    children,
  }: {
    projectId: string;
    needDeadline?: boolean;
    signInMessage?: string;
    children: (props: {
      projectId: string;
      teamId: number;
      teamName: string;
      teamHasLinkedTrelloBoard: boolean;
      deadline: Record<string, unknown> | null;
    }) => ReactNode;
  }) => (
    <div
      data-testid="gate"
      data-project-id={projectId}
      data-need-deadline={String(Boolean(needDeadline))}
      data-sign-in-message={signInMessage}
    >
      {children({
        projectId,
        teamId: gateState.teamId,
        teamName: gateState.teamName,
        teamHasLinkedTrelloBoard: gateState.teamHasLinkedTrelloBoard,
        deadline: gateState.deadline,
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
    deadline,
    viewComponent,
  }: {
    projectId: string;
    teamId: number;
    teamName?: string;
    teamHasLinkedTrelloBoard: boolean;
    deadline?: Record<string, unknown>;
    viewComponent: { name?: string };
  }) => (
    <div
      data-testid="trello-content"
      data-project-id={projectId}
      data-team-id={String(teamId)}
      data-team-name={teamName ?? ""}
      data-has-linked-board={String(teamHasLinkedTrelloBoard)}
      data-has-deadline={String(deadline !== undefined)}
      data-view-component={viewComponent.name ?? "unknown"}
    />
  ),
}));

vi.mock("@/features/trello/views/TrelloGraphsView", () => ({
  TrelloGraphsView: function TrelloGraphsView() {
    return null;
  },
}));

describe("TrelloGraphsPage", () => {
  beforeEach(() => {
    gateState.teamId = 12;
    gateState.teamName = "Team Delta";
    gateState.teamHasLinkedTrelloBoard = true;
    gateState.deadline = null;
  });

  it("passes gate settings and maps null deadline to undefined", async () => {
    const page = await TrelloGraphsPage({ params: Promise.resolve({ projectId: "7" }) });
    render(page);

    expect(screen.getByTestId("gate")).toHaveAttribute("data-project-id", "7");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-need-deadline", "true");
    expect(screen.getByTestId("gate")).toHaveAttribute(
      "data-sign-in-message",
      "Please sign in to view graphs.",
    );
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-has-deadline", "false");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-view-component", "TrelloGraphsView");
  });

  it("passes through a provided deadline object", async () => {
    gateState.deadline = { assessmentDueDate: "2099-01-01T00:00:00.000Z" };

    const page = await TrelloGraphsPage({ params: Promise.resolve({ projectId: "8" }) });
    render(page);

    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-has-deadline", "true");
  });
});
