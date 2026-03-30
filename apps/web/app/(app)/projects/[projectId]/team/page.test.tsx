import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import {
  getProject,
  getProjectDeadline,
  getTeamAllocationQuestionnaireForProject,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import { apiFetch } from "@/shared/api/http";
import ProjectTeamPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
  getProjectDeadline: vi.fn(),
  getTeamAllocationQuestionnaireForProject: vi.fn(),
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
    teamFormationMode,
  }: {
    team: { id: number; teamName?: string } | null;
    projectId: number;
    initialInvites: unknown[];
    teamFormationMode?: "self" | "custom" | "staff";
  }) => (
    <div
      data-testid="team-formation-panel"
      data-project-id={projectId}
      data-team-id={team?.id ?? ""}
      data-team-name={team?.teamName ?? ""}
      data-invite-count={initialInvites.length}
      data-team-mode={teamFormationMode ?? ""}
    />
  ),
}));

vi.mock("@/features/questionnaires/components/QuestionnaireView", () => ({
  QuestionnaireView: ({ questionnaire }: { questionnaire: { id: number; templateName: string } }) => (
    <div
      data-testid="allocation-questionnaire"
      data-template-id={questionnaire.id}
      data-template-name={questionnaire.templateName}
    />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getProjectMock = vi.mocked(getProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getTeamAllocationQuestionnaireForProjectMock = vi.mocked(getTeamAllocationQuestionnaireForProject);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);
const apiFetchMock = vi.mocked(apiFetch);

describe("ProjectTeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectMock.mockResolvedValue({
      id: "1",
      name: "Project",
      informationText: "Project info",
      questionnaireTemplateId: 1,
      teamAllocationQuestionnaireTemplateId: null,
    });
    getProjectDeadlineMock.mockResolvedValue({
      taskOpenDate: null,
      taskDueDate: null,
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      isOverridden: false,
    });
    getTeamAllocationQuestionnaireForProjectMock.mockResolvedValue({
      id: 501,
      templateName: "Allocation Questionnaire",
      purpose: "CUSTOMISED_ALLOCATION",
      createdAt: "2026-03-30T00:00:00.000Z",
      questions: [],
    });
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

  it("shows allocation questionnaire on team page for custom allocation when no team exists", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue(null);
    getProjectMock.mockResolvedValue({
      id: "7",
      name: "Project 7",
      informationText: "Info text",
      questionnaireTemplateId: 1,
      teamAllocationQuestionnaireTemplateId: 77,
    });

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "7" }) });
    render(page);

    expect(getTeamAllocationQuestionnaireForProjectMock).toHaveBeenCalledWith(7);
    expect(screen.getByText("Complete this questionnaire so staff can place you into a team.")).toBeInTheDocument();
    expect(screen.getByTestId("allocation-questionnaire")).toHaveAttribute("data-template-id", "501");
  });
});
