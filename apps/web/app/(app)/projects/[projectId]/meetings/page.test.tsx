import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getProject, getProjectDeadline, getProjectMarking, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import ProjectMeetingsPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
  getProjectDeadline: vi.fn(),
  getProjectMarking: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/features/meetings/components/MeetingsPageContent", () => ({
  MeetingsPageContent: ({
    teamId,
    projectId,
    initialTab,
    projectCompleted,
  }: {
    teamId: number;
    projectId: number;
    initialTab: string;
    projectCompleted?: boolean;
  }) => (
    <div
      data-testid="meetings-page-content"
      data-team-id={teamId}
      data-project-id={projectId}
      data-initial-tab={initialTab}
      data-project-completed={String(Boolean(projectCompleted))}
    />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getProjectMock = vi.mocked(getProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getProjectMarkingMock = vi.mocked(getProjectMarking);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);

describe("ProjectMeetingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectMock.mockResolvedValue({
      id: "15",
      name: "Project",
      questionnaireTemplateId: 1,
      teamAllocationQuestionnaireTemplateId: null,
    } as Awaited<ReturnType<typeof getProject>>);
    getProjectDeadlineMock.mockResolvedValue({
      taskOpenDate: null,
      taskDueDate: null,
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      isOverridden: false,
    } as Awaited<ReturnType<typeof getProjectDeadline>>);
    getProjectMarkingMock.mockResolvedValue({
      teamId: 44,
      teamMarking: null,
      studentMarking: null,
    } as Awaited<ReturnType<typeof getProjectMarking>>);
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
    expect(content).toHaveAttribute("data-project-completed", "false");
  });

  it("forces previous tab when project is completed", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 44 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMarkingMock.mockResolvedValue({
      teamId: 44,
      teamMarking: null,
      studentMarking: { mark: 80 },
    } as Awaited<ReturnType<typeof getProjectMarking>>);

    const page = await ProjectMeetingsPage({
      params: Promise.resolve({ projectId: "15" }),
      searchParams: Promise.resolve({ tab: "upcoming" }),
    });

    render(page);

    const content = screen.getByTestId("meetings-page-content");
    expect(content).toHaveAttribute("data-initial-tab", "previous");
    expect(content).toHaveAttribute("data-project-completed", "true");
  });

  it("falls back when no team is found", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await ProjectMeetingsPage({
      params: Promise.resolve({ projectId: "33" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
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
