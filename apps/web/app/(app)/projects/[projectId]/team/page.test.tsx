import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { apiFetch } from "@/shared/api/http";
import ProjectTeamPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
  getProjectDeadline: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div data-testid="card">{children}</div>,
}));

vi.mock("@/features/projects/components/TeamFormationPanel", () => ({
  TeamFormationPanel: ({
    team,
    projectId,
    initialInvites,
  }: {
    team: { id: number; teamName?: string } | null;
    projectId: number;
    initialInvites: unknown[];
  }) => (
    <div
      data-testid="team-formation-panel"
      data-project-id={projectId}
      data-team-id={team?.id ?? ""}
      data-team-name={team?.teamName ?? ""}
      data-invite-count={initialInvites.length}
    />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);
const apiFetchMock = vi.mocked(apiFetch);

describe("ProjectTeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows sign-in guidance when user is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "12" }) });
    render(page);

    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Please sign in to manage your team.")).toBeInTheDocument();
    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
  });

  it("falls back to empty team state when team lookup fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("team lookup failed"));

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "42" }) });
    render(page);

    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByTestId("team-formation-panel")).toHaveAttribute("data-project-id", "42");
    expect(screen.getByTestId("team-formation-panel")).toHaveAttribute("data-team-id", "");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("loads invites and renders team-specific title when team exists", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 101, teamName: "Alpha" } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    apiFetchMock.mockResolvedValue([{ id: 1 }, { id: 2 }] as Awaited<ReturnType<typeof apiFetch>>);

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "7" }) });
    render(page);

    expect(screen.getByText("Team - Alpha")).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/teams/101/invites");
    expect(screen.getByTestId("team-formation-panel")).toHaveAttribute("data-invite-count", "2");
  });

  it("keeps empty invites when invite fetch fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 99, teamName: "" } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    apiFetchMock.mockRejectedValue(new Error("invite lookup failed"));

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);

    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByTestId("team-formation-panel")).toHaveAttribute("data-invite-count", "0");
  });
});
