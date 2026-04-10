import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StaffTrelloGraphsPage from "./page";

const gateState = vi.hoisted(() => ({
  deadline: "2026-05-30" as string | null,
}));

vi.mock("@/features/staff/trello/StaffTrelloProjectGate", () => ({
  StaffTrelloProjectGate: ({
    projectId,
    needDeadline,
    signInMessage,
    children,
  }: {
    projectId: string;
    needDeadline?: boolean;
    signInMessage: string;
    children: (args: {
      projectId: string;
      teamId: number;
      teamName: string;
      deadline: string | null;
    }) => JSX.Element;
  }) => (
    <div
      data-testid="gate"
      data-project-id={projectId}
      data-need-deadline={needDeadline ? "1" : "0"}
      data-sign-in-message={signInMessage}
    >
      {children({ projectId: "project-44", teamId: 12, teamName: "Team Graph", deadline: gateState.deadline })}
    </div>
  ),
}));

vi.mock("@/features/staff/projects/components/StaffTeamSectionNav", () => ({
  StaffTeamSectionNav: ({ projectId, teamId }: { projectId: string; teamId: string }) => (
    <div data-testid="team-nav" data-project-id={projectId} data-team-id={teamId} />
  ),
}));

vi.mock("@/features/staff/trello/StaffTrelloGraphsView", () => ({
  StaffTrelloGraphsView: function StaffTrelloGraphsView() {
    return <div data-testid="staff-graphs-view" />;
  },
}));

vi.mock("@/features/staff/trello/StaffProjectTrelloContent", () => ({
  StaffProjectTrelloContent: ({
    projectId,
    teamId,
    teamName,
    deadline,
    viewComponent,
  }: {
    projectId: string;
    teamId: number;
    teamName: string;
    deadline?: string;
    viewComponent: { name?: string };
  }) => (
    <div
      data-testid="trello-content"
      data-project-id={projectId}
      data-team-id={String(teamId)}
      data-team-name={teamName}
      data-deadline={deadline ?? ""}
      data-view-component={viewComponent.name ?? "unknown"}
    />
  ),
}));

describe("StaffTrelloGraphsPage", () => {
  it("renders graphs route with deadline-aware gate and explicit deadline", async () => {
    gateState.deadline = "2026-05-30";

    const page = await StaffTrelloGraphsPage({
      params: Promise.resolve({ projectId: "88" }),
    });

    render(page);

    expect(screen.getByTestId("gate")).toHaveAttribute("data-project-id", "88");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-need-deadline", "1");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-sign-in-message", "Please sign in to view graphs.");
    expect(screen.getByTestId("team-nav")).toHaveAttribute("data-team-id", "12");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-project-id", "project-44");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-team-name", "Team Graph");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-deadline", "2026-05-30");
    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-view-component", "StaffTrelloGraphsView");
  });

  it("passes undefined deadline to content when gate has no deadline", async () => {
    gateState.deadline = null;

    const page = await StaffTrelloGraphsPage({
      params: Promise.resolve({ projectId: "88" }),
    });

    render(page);

    expect(screen.getByTestId("trello-content")).toHaveAttribute("data-deadline", "");
  });
});
