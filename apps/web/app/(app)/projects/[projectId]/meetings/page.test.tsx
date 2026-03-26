import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import ProjectMeetingsPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/features/meetings/components/MeetingsPageContent", () => ({
  MeetingsPageContent: ({ teamId, projectId, initialTab }: { teamId: number; projectId: number; initialTab: string }) => (
    <div data-testid="meetings-page-content" data-team-id={teamId} data-project-id={projectId} data-initial-tab={initialTab} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);

describe("ProjectMeetingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders meetings content when a team is available", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 44 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);

    const page = await ProjectMeetingsPage({
      params: Promise.resolve({ projectId: "15" }),
      searchParams: Promise.resolve({ tab: "previous" }),
    });

    render(page);

    const content = screen.getByTestId("meetings-page-content");
    expect(content).toHaveAttribute("data-team-id", "44");
    expect(content).toHaveAttribute("data-project-id", "15");
    expect(content).toHaveAttribute("data-initial-tab", "previous");
  });

  it("falls back when no team is found", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await ProjectMeetingsPage({
      params: Promise.resolve({ projectId: "33" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Back to project" })).toHaveAttribute("href", "/projects/33");
    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
  });

  it("falls back when team lookup throws", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("lookup failed"));

    const page = await ProjectMeetingsPage({
      params: Promise.resolve({ projectId: "88" }),
      searchParams: Promise.resolve({ tab: "upcoming" }),
    });

    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
  });
});
