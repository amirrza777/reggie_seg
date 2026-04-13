"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTeamHealthPanels } from "./ProjectTeamHealthPanels";

const canEditMock = vi.fn(() => true);
const teamHealthPanelPropsSpy = vi.fn();

vi.mock("@/features/projects/workspace/ProjectWorkspaceCanEditContext", () => ({
  useProjectWorkspaceCanEdit: () => ({ canEdit: canEditMock() }),
}));

vi.mock("./TeamHealthMessagePanel", () => ({
  TeamHealthMessagePanel: (props: Record<string, unknown>) => {
    teamHealthPanelPropsSpy(props);
    return <div data-testid="team-health-message-panel" />;
  },
}));

function warning(id: number, severity: "LOW" | "MEDIUM" | "HIGH" = "LOW") {
  return {
    id,
    projectId: 9,
    teamId: 5,
    type: "signal",
    severity,
    title: `Warning ${id}`,
    details: `Details ${id}`,
    source: "AUTO",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    resolvedAt: null,
  } as any;
}

describe("ProjectTeamHealthPanels", () => {
  beforeEach(() => {
    canEditMock.mockReset();
    canEditMock.mockReturnValue(true);
    teamHealthPanelPropsSpy.mockReset();
  });

  it("renders messages tab by default and passes allowNewMessages=true", () => {
    render(
      <ProjectTeamHealthPanels
        projectId={22}
        userId={7}
        initialRequests={[{ id: 1 } as any]}
        activeWarnings={[]}
        messagesLoadError={null}
        warningsLoadError={null}
      />,
    );

    expect(screen.getByText("Submit and track team health messages for your team.")).toBeInTheDocument();
    expect(screen.getByTestId("team-health-message-panel")).toBeInTheDocument();
    expect(teamHealthPanelPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 22,
        userId: 7,
        allowNewMessages: true,
      }),
    );
  });

  it("renders archived copy and messages error when workspace cannot be edited", () => {
    canEditMock.mockReturnValue(false);

    render(
      <ProjectTeamHealthPanels
        projectId={22}
        userId={7}
        initialRequests={[]}
        activeWarnings={[]}
        messagesLoadError="Unable to load messages."
        warningsLoadError={null}
      />,
    );

    expect(
      screen.getByText(
        "Historical team health messages for your team. New messages cannot be added while this project is archived.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Unable to load messages.")).toBeInTheDocument();
    expect(teamHealthPanelPropsSpy).toHaveBeenCalledWith(expect.objectContaining({ allowNewMessages: false }));
  });

  it("shows warnings tab states and warnings load error", () => {
    render(
      <ProjectTeamHealthPanels
        projectId={22}
        userId={7}
        initialRequests={[]}
        activeWarnings={[]}
        messagesLoadError={null}
        warningsLoadError="Failed to load warnings."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Warnings" }));
    expect(screen.getByText("No warnings for your team right now.")).toBeInTheDocument();
    expect(screen.getByText("Failed to load warnings.")).toBeInTheDocument();
  });

  it("paginates warnings and includes severity count in tab label", () => {
    render(
      <ProjectTeamHealthPanels
        projectId={22}
        userId={7}
        initialRequests={[]}
        activeWarnings={[
          warning(1, "HIGH"),
          warning(2, "MEDIUM"),
          warning(3, "LOW"),
          warning(4, "LOW"),
          warning(5, "LOW"),
          warning(6, "LOW"),
        ]}
        messagesLoadError={null}
        warningsLoadError={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Warnings (6)" }));
    expect(screen.getByText("Warning 1")).toBeInTheDocument();
    expect(screen.queryByText("Warning 6")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Warning 6")).toBeInTheDocument();
    expect(screen.queryByText("Warning 1")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Warning 1")).toBeInTheDocument();
  });

  it("does not render pagination controls when warnings fit on one page", () => {
    render(
      <ProjectTeamHealthPanels
        projectId={22}
        userId={7}
        initialRequests={[]}
        activeWarnings={[warning(1), warning(2)]}
        messagesLoadError={null}
        warningsLoadError={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Warnings (2)" }));
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });
});
