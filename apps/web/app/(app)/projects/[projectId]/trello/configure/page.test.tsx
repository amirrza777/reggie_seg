import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import ConfigureTrelloPage from "./page";

vi.mock("@/features/trello/components/TrelloProjectGate", () => ({
  TrelloProjectGate: ({
    projectId,
    signInMessage,
    children,
  }: {
    projectId: string;
    signInMessage?: string;
    children: (props: { projectId: string; teamId: number; teamName: string }) => ReactNode;
  }) => (
    <div data-testid="gate" data-project-id={projectId} data-sign-in-message={signInMessage}>
      {children({
        projectId,
        teamId: 19,
        teamName: "Team Nova",
      })}
    </div>
  ),
}));

vi.mock("@/features/trello/components/ConfigureTrelloContent", () => ({
  ConfigureTrelloContent: ({
    projectId,
    teamId,
    teamName,
  }: {
    projectId: string;
    teamId: number;
    teamName?: string;
  }) => (
    <div
      data-testid="configure-content"
      data-project-id={projectId}
      data-team-id={String(teamId)}
      data-team-name={teamName ?? ""}
    />
  ),
}));

describe("ConfigureTrelloPage", () => {
  it("renders configure content through the project gate", async () => {
    const page = await ConfigureTrelloPage({ params: Promise.resolve({ projectId: "52" }) });
    render(page);

    expect(screen.getByTestId("gate")).toHaveAttribute("data-project-id", "52");
    expect(screen.getByTestId("gate")).toHaveAttribute(
      "data-sign-in-message",
      "Please sign in to configure Trello.",
    );
    expect(screen.getByTestId("configure-content")).toHaveAttribute("data-project-id", "52");
    expect(screen.getByTestId("configure-content")).toHaveAttribute("data-team-id", "19");
    expect(screen.getByTestId("configure-content")).toHaveAttribute("data-team-name", "Team Nova");
  });
});
