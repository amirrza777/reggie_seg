import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { dismissTeamFlag } from "@/features/projects/api/client";
import { StaffTeamCard } from "./StaffTeamCard";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/features/projects/api/client", () => ({
  dismissTeamFlag: vi.fn(),
}));

const dismissTeamFlagMock = dismissTeamFlag as MockedFunction<typeof dismissTeamFlag>;

function buildTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    teamName: "Team Rocket",
    inactivityFlag: "RED",
    trelloBoardId: null,
    allocations: [
      {
        userId: 1,
        user: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", githubAccount: null },
      },
      {
        userId: 2,
        user: { firstName: "Grace", lastName: "Hopper", email: "grace@example.com", githubAccount: { username: "grace" } },
      },
    ],
    ...overrides,
  } as any;
}

describe("StaffTeamCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dismissTeamFlagMock.mockResolvedValue(undefined as never);
  });

  it("navigates on click and keyboard events", () => {
    render(<StaffTeamCard team={buildTeam({ inactivityFlag: "NONE" })} projectId={99} />);

    const card = screen.getByRole("link");
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });

    expect(pushMock).toHaveBeenCalledWith("/staff/projects/99/teams/42");
    expect(pushMock.mock.calls.length).toBe(3);
  });

  it("renders allocation badges, trello status, and fallback state when empty", () => {
    const { rerender } = render(<StaffTeamCard team={buildTeam()} projectId={10} />);

    expect(screen.getByText("Team Rocket")).toBeInTheDocument();
    expect(screen.getByText("2 members")).toBeInTheDocument();
    expect(screen.getByText(/GitHub not connected: 1 member/)).toBeInTheDocument();
    expect(screen.getByText("Trello not added")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.getByText("GH")).toBeInTheDocument();

    rerender(<StaffTeamCard team={buildTeam({ allocations: [], inactivityFlag: "NONE", trelloBoardId: "board_1" })} projectId={10} />);
    expect(screen.getByText("No students assigned yet.")).toBeInTheDocument();
    expect(screen.getByText("Trello")).toBeInTheDocument();
  });

  it("dismisses red inactivity flag and keeps card click isolated", async () => {
    let resolveDismiss: (() => void) | null = null;
    dismissTeamFlagMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDismiss = resolve;
        }) as never,
    );

    render(<StaffTeamCard team={buildTeam()} projectId={12} />);

    const dismissButton = screen.getByRole("button", { name: "Dismiss flag" });
    fireEvent.click(dismissButton);

    expect(dismissTeamFlagMock).toHaveBeenCalledWith(42);
    expect(dismissButton).toBeDisabled();
    expect(pushMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveDismiss?.();
    });

    await waitFor(() => expect(screen.queryByText(/Inactive 14\+ days/)).not.toBeInTheDocument());
  });
});
