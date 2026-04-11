import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Team } from "@/features/projects/types";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import TrelloLayout from "./layout";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/features/trello/context/TrelloBoardContext", () => ({
  TrelloBoardProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="trello-board-provider">{children}</div>
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);

const minimalTeam = { id: 7, teamName: "T", projectId: 1 } as Team;

describe("TrelloLayout (project)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children without provider when user is not signed in", async () => {
    getCurrentUserMock.mockResolvedValue(null as Awaited<ReturnType<typeof getCurrentUser>>);

    const tree = await TrelloLayout({
      params: Promise.resolve({ projectId: "1" }),
      children: <span data-testid="child">inner</span>,
    });
    render(tree);

    expect(screen.queryByTestId("trello-board-provider")).not.toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("inner");
    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
  });

  it("wraps children in TrelloBoardProvider when team resolves", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 99 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue(minimalTeam);

    const tree = await TrelloLayout({
      params: Promise.resolve({ projectId: "5" }),
      children: <span data-testid="child">inner</span>,
    });
    render(tree);

    expect(screen.getByTestId("trello-board-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("inner");
    expect(getTeamByUserAndProjectMock).toHaveBeenCalledWith(99, 5);
  });

  it("renders children without provider when team lookup throws", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("network"));

    const tree = await TrelloLayout({
      params: Promise.resolve({ projectId: "2" }),
      children: <span data-testid="child">inner</span>,
    });
    render(tree);

    expect(screen.queryByTestId("trello-board-provider")).not.toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("inner");
  });
});
