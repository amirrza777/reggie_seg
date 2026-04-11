import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectDeadline, getProjectMarking, getUserProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import ProjectsListPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getUserProjects: vi.fn(),
  getProjectMarking: vi.fn(),
  getProjectDeadline: vi.fn(),
}));

const projectListMock = vi.fn((props: Record<string, unknown>) => (
  <div
    data-testid="project-list"
    data-project-count={String((props.projects as unknown[]).length)}
    data-meta={JSON.stringify(props.projectMetaById)}
  />
));

vi.mock("@/features/projects/components/ProjectList", () => ({
  ProjectList: (props: Record<string, unknown>) => projectListMock(props),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getUserProjectsMock = vi.mocked(getUserProjects);
const getProjectMarkingMock = vi.mocked(getProjectMarking);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);

describe("ProjectsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T12:00:00.000Z"));
  });

  it("renders empty state for signed-out users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await ProjectsListPage();
    render(page);

    expect(screen.getByText("You have no projects assigned yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Projects appear here once a staff member or admin assigns you to a team."),
    ).toBeInTheDocument();
    expect(projectListMock).not.toHaveBeenCalled();
    expect(getUserProjectsMock).not.toHaveBeenCalled();
  });

  it("renders empty state when project fetch fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getUserProjectsMock.mockRejectedValue(new Error("projects down"));

    const page = await ProjectsListPage();
    render(page);

    expect(screen.getByText("You have no projects assigned yet.")).toBeInTheDocument();
    expect(projectListMock).not.toHaveBeenCalled();
  });

  it("builds project meta for completed, finished-unmarked, and invalid-id projects", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getUserProjectsMock.mockResolvedValue([
      { id: "1", name: "Marked project", archivedAt: null },
      { id: "2", name: "Finished project", archivedAt: null },
      { id: "abc", name: "Invalid id project", archivedAt: null },
    ] as Awaited<ReturnType<typeof getUserProjects>>);
    getProjectMarkingMock
      .mockResolvedValueOnce({
        studentMarking: { mark: 81 },
        teamMarking: { mark: null },
      } as Awaited<ReturnType<typeof getProjectMarking>>)
      .mockResolvedValueOnce({
        studentMarking: { mark: null },
        teamMarking: { mark: null },
      } as Awaited<ReturnType<typeof getProjectMarking>>);
    getProjectDeadlineMock
      .mockResolvedValueOnce({
        taskDueDate: "2099-01-01T00:00:00.000Z",
        assessmentDueDate: null,
        feedbackDueDate: null,
      } as Awaited<ReturnType<typeof getProjectDeadline>>)
      .mockResolvedValueOnce({
        taskDueDate: "2026-04-01T00:00:00.000Z",
        assessmentDueDate: "invalid",
        feedbackDueDate: null,
      } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await ProjectsListPage();
    render(page);

    const list = screen.getByTestId("project-list");
    expect(list).toHaveAttribute("data-project-count", "3");

    const meta = JSON.parse(list.getAttribute("data-meta") ?? "{}") as Record<
      string,
      { completed: boolean; finishedUnmarked: boolean; mark: number | null }
    >;
    expect(meta["1"]).toEqual({ completed: true, finishedUnmarked: false, mark: 81 });
    expect(meta["2"]).toEqual({ completed: false, finishedUnmarked: true, mark: null });
    expect(meta["abc"]).toEqual({ completed: false, finishedUnmarked: false, mark: null });
  });

  it("handles per-project marking/deadline failures and archived project completion", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getUserProjectsMock.mockResolvedValue([
      { id: "10", name: "Archived", archivedAt: "2026-02-01T00:00:00.000Z" },
      { id: "11", name: "Erroring", archivedAt: null },
    ] as Awaited<ReturnType<typeof getUserProjects>>);
    getProjectMarkingMock.mockRejectedValueOnce(new Error("marking failed")).mockRejectedValueOnce(new Error("x"));
    getProjectDeadlineMock
      .mockResolvedValueOnce({
        taskDueDate: null,
        assessmentDueDate: null,
        feedbackDueDate: null,
      } as Awaited<ReturnType<typeof getProjectDeadline>>)
      .mockRejectedValueOnce(new Error("deadline failed"));

    const page = await ProjectsListPage();
    render(page);

    const list = screen.getByTestId("project-list");
    const meta = JSON.parse(list.getAttribute("data-meta") ?? "{}") as Record<
      string,
      { completed: boolean; finishedUnmarked: boolean; mark: number | null }
    >;
    expect(meta["10"]).toEqual({ completed: false, finishedUnmarked: true, mark: null });
    expect(meta["11"]).toEqual({ completed: false, finishedUnmarked: false, mark: null });
  });
});
