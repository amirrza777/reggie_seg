import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import ProjectPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
  getProjectDeadline: vi.fn(),
  getProjectMarking: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/features/projects/components/ProjectOverviewDashboard", () => ({
  ProjectOverviewDashboard: ({
    project,
    deadline,
    team,
    marking,
  }: {
    project: { title?: string };
    deadline: { taskDueDate?: string | null; isOverridden?: boolean };
    team: { id: number };
    marking: { grade?: string } | null;
  }) => (
    <div
      data-testid="project-overview-dashboard"
      data-project-title={project.title ?? ""}
      data-team-id={team.id}
      data-marking={marking?.grade ?? ""}
      data-deadline={deadline.taskDueDate ?? ""}
      data-overridden={String(Boolean(deadline.isOverridden))}
    />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getProjectMock = vi.mocked(getProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getProjectMarkingMock = vi.mocked(getProjectMarking);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);

describe("ProjectPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login prompt when user is unauthenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await ProjectPage({ params: Promise.resolve({ projectId: "15" }) });
    render(page);

    expect(screen.getByText("Please sign in to view this project.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to login" })).toHaveAttribute("href", "/login");
  });

  it("shows no-team state when team lookup fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 10 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("team lookup failed"));

    const page = await ProjectPage({ params: Promise.resolve({ projectId: "22" }) });
    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
  });

  it("renders overview dashboard with fallback deadline and nullable marking", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 99 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({ title: "Project Titan" } as Awaited<ReturnType<typeof getProject>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline api down"));
    getProjectMarkingMock.mockRejectedValue(new Error("marking api down"));

    const page = await ProjectPage({ params: Promise.resolve({ projectId: "44" }) });
    render(page);

    const dashboard = screen.getByTestId("project-overview-dashboard");
    expect(getProjectMock).toHaveBeenCalledWith("44");
    expect(getProjectDeadlineMock).toHaveBeenCalledWith(7, 44);
    expect(getProjectMarkingMock).toHaveBeenCalledWith(7, 44);
    expect(dashboard).toHaveAttribute("data-project-title", "Project Titan");
    expect(dashboard).toHaveAttribute("data-team-id", "99");
    expect(dashboard).toHaveAttribute("data-marking", "");
    expect(dashboard).toHaveAttribute("data-overridden", "false");
  });

  it("renders overview dashboard with API-provided deadline and marking", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 101 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({
      title: "Project Nova",
      archivedAt: "2026-06-21T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getProject>>);
    getProjectDeadlineMock.mockResolvedValue({
      taskDueDate: "2026-06-20T00:00:00.000Z",
      isOverridden: true,
    } as Awaited<ReturnType<typeof getProjectDeadline>>);
    getProjectMarkingMock.mockResolvedValue({ grade: "A" } as Awaited<ReturnType<typeof getProjectMarking>>);

    const page = await ProjectPage({ params: Promise.resolve({ projectId: "90" }) });
    render(page);

    const dashboard = screen.getByTestId("project-overview-dashboard");
    expect(getProjectMarkingMock).toHaveBeenCalledWith(3, 90);
    expect(dashboard).toHaveAttribute("data-project-title", "Project Nova");
    expect(dashboard).toHaveAttribute("data-marking", "A");
    expect(dashboard).toHaveAttribute("data-deadline", "2026-06-20T00:00:00.000Z");
    expect(dashboard).toHaveAttribute("data-overridden", "true");
  });
});
