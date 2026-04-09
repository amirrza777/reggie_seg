import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import MeetingSchedulerPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/features/meetings/components/MeetingsPageContent", () => ({
  MeetingsPageContent: ({ teamId, projectId }: { teamId: number; projectId: number }) => (
    <div data-testid="meetings-page-content" data-team-id={teamId} data-project-id={projectId} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);

describe("MeetingSchedulerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders meetings content when a team is found", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 44 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);

    const page = await MeetingSchedulerPage({ params: Promise.resolve({ projectId: "15" }) });
    render(page);

    const content = screen.getByTestId("meetings-page-content");
    expect(content).toHaveAttribute("data-team-id", "44");
    expect(content).toHaveAttribute("data-project-id", "15");
  });

  it("shows fallback when there is no user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await MeetingSchedulerPage({ params: Promise.resolve({ projectId: "33" }) });
    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Back to project" })).toHaveAttribute("href", "/projects/33");
    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
  });

  it("shows fallback when team lookup throws", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("lookup failed"));

    const page = await MeetingSchedulerPage({ params: Promise.resolve({ projectId: "88" }) });
    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
  });
});
