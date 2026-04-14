import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import {
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getTeamAllocationQuestionnaireStatusForProject,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import { apiFetch } from "@/shared/api/http";
import { redirectOnUnauthorized } from "@/shared/auth/redirectOnUnauthorized";
import ProjectTeamPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
  getProjectDeadline: vi.fn(),
  getProjectMarking: vi.fn(),
  getTeamAllocationQuestionnaireStatusForProject: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/shared/auth/redirectOnUnauthorized", () => ({
  redirectOnUnauthorized: vi.fn(),
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

vi.mock("@/features/projects/components/TeamAllocationQuestionnaireCard", () => ({
  TeamAllocationQuestionnaireCard: ({
    questionnaire,
    initialSubmitted,
  }: {
    questionnaire: { id: number };
    initialSubmitted?: boolean;
  }) => (
    <div
      data-testid="allocation-questionnaire"
      data-template-id={questionnaire.id}
      data-submitted={String(Boolean(initialSubmitted))}
    />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getProjectMock = vi.mocked(getProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getProjectMarkingMock = vi.mocked(getProjectMarking);
const getTeamAllocationQuestionnaireStatusForProjectMock = vi.mocked(getTeamAllocationQuestionnaireStatusForProject);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);
const apiFetchMock = vi.mocked(apiFetch);
const redirectOnUnauthorizedMock = vi.mocked(redirectOnUnauthorized);

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
    getProjectMarkingMock.mockResolvedValue({
      teamId: 1,
      teamMarking: null,
      studentMarking: null,
    } as Awaited<ReturnType<typeof getProjectMarking>>);
    getTeamAllocationQuestionnaireStatusForProjectMock.mockResolvedValue({
      questionnaireTemplate: {
        id: 501,
        purpose: "CUSTOMISED_ALLOCATION",
        questions: [],
      },
      hasSubmitted: false,
      teamAllocationQuestionnaireOpenDate: "2026-03-01T00:00:00.000Z",
      teamAllocationQuestionnaireDueDate: "2026-04-01T00:00:00.000Z",
      windowIsOpen: true,
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

    expect(getTeamAllocationQuestionnaireStatusForProjectMock).toHaveBeenCalledWith(7);
    expect(screen.getByTestId("allocation-questionnaire")).toHaveAttribute("data-template-id", "501");
    expect(screen.getByTestId("allocation-questionnaire")).toHaveAttribute("data-submitted", "false");
  });

  it("continues when project marking lookup fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 17 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 5, teamName: "Beta" } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMarkingMock.mockRejectedValueOnce(new Error("mark lookup failed"));

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "4" }) });
    render(page);

    expect(redirectOnUnauthorizedMock).toHaveBeenCalled();
    expect(screen.getByTestId("team-formation-panel")).toHaveAttribute("data-team-id", "5");
  });

  it("falls back gracefully when project load fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 8 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 9, teamName: "Gamma" } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockRejectedValueOnce(new Error("project failed"));

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "6" }) });
    render(page);

    expect(redirectOnUnauthorizedMock).toHaveBeenCalled();
    expect(screen.getByTestId("team-formation-panel")).toHaveAttribute("data-team-id", "9");
  });

  it("shows waiting card when custom allocation window is closed", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue(null);
    getProjectMock.mockResolvedValue({
      id: "7",
      name: "Project 7",
      informationText: "Info text",
      questionnaireTemplateId: 1,
      teamAllocationQuestionnaireTemplateId: 77,
    });
    getTeamAllocationQuestionnaireStatusForProjectMock.mockResolvedValueOnce({
      questionnaireTemplate: {
        id: 501,
        purpose: "CUSTOMISED_ALLOCATION",
        questions: [],
      },
      hasSubmitted: false,
      teamAllocationQuestionnaireOpenDate: "2026-03-01T00:00:00.000Z",
      teamAllocationQuestionnaireDueDate: "2026-04-01T00:00:00.000Z",
      windowIsOpen: false,
    });

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "7" }) });
    render(page);

    expect(screen.getByText("Please wait for staff to add you to a team for this project.")).toBeInTheDocument();
  });

  it("shows unavailable questionnaire copy when status fetch fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue(null);
    getProjectMock.mockResolvedValue({
      id: "7",
      name: "Project 7",
      informationText: "Info text",
      questionnaireTemplateId: 1,
      teamAllocationQuestionnaireTemplateId: 77,
    });
    getTeamAllocationQuestionnaireStatusForProjectMock.mockRejectedValueOnce(new Error("status failed"));

    const page = await ProjectTeamPage({ params: Promise.resolve({ projectId: "7" }) });
    render(page);

    expect(redirectOnUnauthorizedMock).toHaveBeenCalled();
    expect(
      screen.getByText("Allocation questionnaire is not available right now. Please try again shortly."),
    ).toBeInTheDocument();
  });
});
