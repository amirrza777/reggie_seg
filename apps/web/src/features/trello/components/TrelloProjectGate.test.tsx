import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TrelloProjectGate } from "./TrelloProjectGate";

const getCurrentUserMock = vi.fn();
const getTeamByUserAndProjectMock = vi.fn();
const getProjectMock = vi.fn();
const getProjectDeadlineMock = vi.fn();

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getTeamByUserAndProject: (...a: unknown[]) => getTeamByUserAndProjectMock(...a),
  getProject: (...a: unknown[]) => getProjectMock(...a),
  getProjectDeadline: (...a: unknown[]) => getProjectDeadlineMock(...a),
}));

vi.mock("@/features/projects/components/CustomAllocationWaitingBoard", () => ({
  CustomAllocationWaitingBoard: ({ projectId }: { projectId: string }) => (
    <div data-testid="custom-waiting">waiting-{projectId}</div>
  ),
}));

describe("TrelloProjectGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sign-in message when user is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const node = await TrelloProjectGate({
      projectId: "5",
      signInMessage: "Custom please sign in",
      children: () => <div>child</div>,
    });
    render(node as React.ReactElement);
    expect(screen.getByText("Custom please sign in")).toBeInTheDocument();
  });

  it("renders children with team props when team exists", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1 });
    getTeamByUserAndProjectMock.mockResolvedValue({
      id: 42,
      teamName: "Alpha",
      trelloBoardId: "b123",
    });
    const node = await TrelloProjectGate({
      projectId: "5",
      children: ({ teamId, teamHasLinkedTrelloBoard, teamName }) => (
        <div>
          <span data-testid="tid">{teamId}</span>
          <span data-testid="board">{String(teamHasLinkedTrelloBoard)}</span>
          <span data-testid="name">{teamName}</span>
        </div>
      ),
    });
    render(node as React.ReactElement);
    expect(screen.getByTestId("tid")).toHaveTextContent("42");
    expect(screen.getByTestId("board")).toHaveTextContent("true");
    expect(screen.getByTestId("name")).toHaveTextContent("Alpha");
  });

  it("treats blank trelloBoardId as unlinked", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1 });
    getTeamByUserAndProjectMock.mockResolvedValue({
      id: 1,
      trelloBoardId: "   ",
    });
    const node = await TrelloProjectGate({
      projectId: "5",
      children: ({ teamHasLinkedTrelloBoard }) => (
        <span data-testid="board">{String(teamHasLinkedTrelloBoard)}</span>
      ),
    });
    render(node as React.ReactElement);
    expect(screen.getByTestId("board")).toHaveTextContent("false");
  });

  it("loads deadline when needDeadline and team exists", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1 });
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 7, trelloBoardId: null });
    getProjectDeadlineMock.mockResolvedValue({ taskDueDate: "2024-01-01" });
    const node = await TrelloProjectGate({
      projectId: "5",
      needDeadline: true,
      children: ({ deadline }) => <span data-testid="dl">{deadline ? "yes" : "no"}</span>,
    });
    render(node as React.ReactElement);
    expect(getProjectDeadlineMock).toHaveBeenCalled();
    expect(screen.getByTestId("dl")).toHaveTextContent("yes");
  });

  it("swallows team fetch errors and shows not-in-team or custom allocation", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1 });
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("network"));
    getProjectMock.mockResolvedValue({ teamAllocationQuestionnaireTemplateId: "t1" });
    const node = await TrelloProjectGate({
      projectId: "9",
      children: () => <div>child</div>,
    });
    render(node as React.ReactElement);
    expect(screen.getByTestId("custom-waiting")).toHaveTextContent("waiting-9");
  });

  it("shows generic not-in-team when team missing and not custom allocation", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1 });
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("network"));
    getProjectMock.mockResolvedValue({ teamAllocationQuestionnaireTemplateId: null });
    const node = await TrelloProjectGate({
      projectId: "9",
      children: () => <div>child</div>,
    });
    render(node as React.ReactElement);
    expect(screen.getByText(/not in a team/i)).toBeInTheDocument();
  });

  it("handles getProject failure when resolving custom allocation", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1 });
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("network"));
    getProjectMock.mockRejectedValue(new Error("boom"));
    const node = await TrelloProjectGate({
      projectId: "9",
      children: () => <div>child</div>,
    });
    render(node as React.ReactElement);
    expect(screen.getByText(/not in a team/i)).toBeInTheDocument();
  });

  it("skips deadline fetch when needDeadline false", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1 });
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 1, trelloBoardId: "x" });
    const node = await TrelloProjectGate({
      projectId: "5",
      children: () => <span>ok</span>,
    });
    render(node as React.ReactElement);
    expect(getProjectDeadlineMock).not.toHaveBeenCalled();
  });

  it("swallows deadline errors", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1 });
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 1, trelloBoardId: "x" });
    getProjectDeadlineMock.mockRejectedValue(new Error("no deadline"));
    const node = await TrelloProjectGate({
      projectId: "5",
      needDeadline: true,
      children: ({ deadline }) => <span data-testid="dl">{deadline ? "yes" : "no"}</span>,
    });
    render(node as React.ReactElement);
    expect(screen.getByTestId("dl")).toHaveTextContent("no");
  });
});
