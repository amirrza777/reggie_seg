import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getProject, getProjectDeadline, getProjectMarking, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { redirectOnUnauthorized } from "@/shared/auth/redirectOnUnauthorized";
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

vi.mock("@/shared/auth/redirectOnUnauthorized", () => ({
  redirectOnUnauthorized: vi.fn(),
}));

vi.mock("@/features/meetings/components/MeetingsPageContent", () => ({
  MeetingsPageContent: ({ teamId, projectId, initialTab }: { teamId: number; projectId: number; initialTab: string }) => (
    <div data-testid="meetings-page-content" data-team-id={teamId} data-project-id={projectId} data-initial-tab={initialTab} />
  ),
}));

vi.mock("@/features/projects/components/CustomAllocationWaitingBoard", () => ({
  CustomAllocationWaitingBoard: ({ projectId }: { projectId: string }) => (
    <div data-testid="custom-allocation-waiting-board" data-project-id={projectId}>
      waiting
    </div>
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getProjectMock = vi.mocked(getProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getProjectMarkingMock = vi.mocked(getProjectMarking);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);
const redirectOnUnauthorizedMock = vi.mocked(redirectOnUnauthorized);

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
    expect(redirectOnUnauthorizedMock).toHaveBeenCalled();
  });

  it("renders custom-allocation waiting board when team is missing but custom allocation is enabled", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue(null as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({
      id: "15",
      name: "Project",
      questionnaireTemplateId: 1,
      teamAllocationQuestionnaireTemplateId: 123,
    } as Awaited<ReturnType<typeof getProject>>);

    const page = await ProjectMeetingsPage({
      params: Promise.resolve({ projectId: "15" }),
      searchParams: Promise.resolve({}),
    });

    render(page);
    const waiting = screen.getByTestId("custom-allocation-waiting-board");
    expect(waiting).toHaveAttribute("data-project-id", "15");
  });

  it("defaults initial tab to upcoming and handles marking unauthorized failures", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 44 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMarkingMock.mockRejectedValueOnce(new Error("unauthorized"));

    const page = await ProjectMeetingsPage({
      params: Promise.resolve({ projectId: "15" }),
      searchParams: Promise.resolve({ tab: "invalid-tab" }),
    });

    render(page);

    const content = screen.getByTestId("meetings-page-content");
    expect(content).toHaveAttribute("data-initial-tab", "upcoming");
    expect(redirectOnUnauthorizedMock).toHaveBeenCalled();
  });
});
