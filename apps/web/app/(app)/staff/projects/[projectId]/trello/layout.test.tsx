import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTrelloLayout, { metadata } from "./layout";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/features/trello/context/TrelloBoardContext", () => ({
  TrelloBoardProvider: ({ teamId, children }: { teamId: number; children: ReactNode }) => (
    <div data-testid="trello-provider" data-team-id={String(teamId)}>
      {children}
    </div>
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);

describe("StaffTrelloLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports staff trello metadata", () => {
    expect(metadata.title).toBe("Trello (staff)");
  });

  it("renders children directly when no user is present", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const page = await StaffTrelloLayout({
      params: Promise.resolve({ projectId: "44" }),
      children: <div data-testid="child" />,
    });

    render(page);

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByTestId("trello-provider")).not.toBeInTheDocument();
    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
  });

  it("wraps children in TrelloBoardProvider when team is resolved", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 15 });
    getTeamByUserAndProjectMock.mockResolvedValueOnce({ id: 501, name: "Team A" });

    const page = await StaffTrelloLayout({
      params: Promise.resolve({ projectId: "99" }),
      children: <div data-testid="child" />,
    });

    render(page);

    expect(getTeamByUserAndProjectMock).toHaveBeenCalledWith(15, 99);
    expect(screen.getByTestId("trello-provider")).toHaveAttribute("data-team-id", "501");
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("falls back to plain children when team lookup fails", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 22 });
    getTeamByUserAndProjectMock.mockRejectedValueOnce(new Error("lookup failed"));

    const page = await StaffTrelloLayout({
      params: Promise.resolve({ projectId: "101" }),
      children: <div data-testid="child" />,
    });

    render(page);

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByTestId("trello-provider")).not.toBeInTheDocument();
  });
});
