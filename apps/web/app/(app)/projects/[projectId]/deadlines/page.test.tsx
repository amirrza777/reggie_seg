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
import DeadlinesPage from "./page";

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
    view,
  }: {
    project: { id?: number };
    deadline: { assessmentDueDate?: string | null; isOverridden?: boolean };
    team: { id: number } | null;
    marking: { finalGrade?: string } | null;
    view: string;
  }) => (
    <div
      data-testid="deadlines-dashboard"
      data-project-id={String(project.id ?? "")}
      data-team-id={String(team?.id ?? "")}
      data-marking={String(marking?.finalGrade ?? "")}
      data-assessment-due={String(deadline.assessmentDueDate ?? "")}
      data-overridden={String(Boolean(deadline.isOverridden))}
      data-view={view}
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

describe("DeadlinesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sign-in prompt when no user exists", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await DeadlinesPage({ params: Promise.resolve({ projectId: "15" }) });
    render(page);

    expect(screen.getByText("Please sign in to view this project.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to login" })).toHaveAttribute("href", "/login");
    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
  });

  it("renders team-missing state when team lookup fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("team unavailable"));

    const page = await DeadlinesPage({ params: Promise.resolve({ projectId: "91" }) });
    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
    expect(getProjectMock).not.toHaveBeenCalled();
  });

  it("renders dashboard with fallback deadline and null marking when APIs fail", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 77 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({ id: 91 } as Awaited<ReturnType<typeof getProject>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline down"));
    getProjectMarkingMock.mockRejectedValue(new Error("marking down"));

    const page = await DeadlinesPage({ params: Promise.resolve({ projectId: "91" }) });
    render(page);

    const dashboard = screen.getByTestId("deadlines-dashboard");
    expect(dashboard).toHaveAttribute("data-project-id", "91");
    expect(dashboard).toHaveAttribute("data-team-id", "77");
    expect(dashboard).toHaveAttribute("data-assessment-due", "");
    expect(dashboard).toHaveAttribute("data-marking", "");
    expect(dashboard).toHaveAttribute("data-overridden", "false");
    expect(dashboard).toHaveAttribute("data-view", "deadlines");
  });

  it("renders dashboard with deadline and marking from API", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 12 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({ id: 44 } as Awaited<ReturnType<typeof getProject>>);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentDueDate: "2026-05-01T10:00:00.000Z",
      isOverridden: true,
    } as Awaited<ReturnType<typeof getProjectDeadline>>);
    getProjectMarkingMock.mockResolvedValue({
      finalGrade: "A",
    } as Awaited<ReturnType<typeof getProjectMarking>>);

    const page = await DeadlinesPage({ params: Promise.resolve({ projectId: "44" }) });
    render(page);

    const dashboard = screen.getByTestId("deadlines-dashboard");
    expect(getProjectMock).toHaveBeenCalledWith("44");
    expect(getProjectDeadlineMock).toHaveBeenCalledWith(3, 44);
    expect(getProjectMarkingMock).toHaveBeenCalledWith(3, 44);
    expect(dashboard).toHaveAttribute("data-assessment-due", "2026-05-01T10:00:00.000Z");
    expect(dashboard).toHaveAttribute("data-marking", "A");
    expect(dashboard).toHaveAttribute("data-overridden", "true");
  });
});
