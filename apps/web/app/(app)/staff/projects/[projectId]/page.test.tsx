import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffProjectManage } from "@/features/projects/api/client";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffProjectTeamsPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectManage: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffTeamCard", () => ({
  StaffTeamCard: ({ team }: { team: { teamName: string } }) => <div data-testid="team-card">{team.teamName}</div>,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamsMock = vi.mocked(getStaffProjectTeams);
const getManageMock = vi.mocked(getStaffProjectManage);

const emptyManageSummary: StaffProjectManageSummary = {
  id: 3,
  name: "P",
  archivedAt: null,
  moduleId: 1,
  moduleArchivedAt: null,
  informationText: null,
  questionnaireTemplateId: 1,
  questionnaireTemplate: null,
  projectDeadline: null,
  hasSubmittedPeerAssessments: false,
  projectAccess: {
    moduleLeaders: [],
    moduleTeachingAssistants: [],
    moduleMemberDirectory: [],
    projectStudentIds: [],
  },
  canMutateProjectSettings: true,
};

describe("StaffProjectTeamsPage (project overview)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: true } as Awaited<ReturnType<typeof getCurrentUser>>);
    getManageMock.mockResolvedValue(emptyManageSummary);
  });

  it("lists team cards when teams exist", async () => {
    getTeamsMock.mockResolvedValue({
      project: { id: 3, name: "P", moduleId: 1 },
      teams: [{ id: 10, teamName: "Alpha", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    const page = await StaffProjectTeamsPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);
    expect(screen.getByRole("heading", { name: /Information Board/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Deadlines and Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Adjust deadlines/i })).toHaveAttribute("href", "/staff/projects/3/manage");
    expect(screen.getByTestId("team-card")).toHaveTextContent("Alpha");
  });

  it("shows empty copy when there are no teams", async () => {
    getTeamsMock.mockResolvedValue({
      project: { id: 3, name: "P", moduleId: 1 },
      teams: [],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    const page = await StaffProjectTeamsPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);
    expect(screen.getByText(/No teams exist in this project yet/i)).toBeInTheDocument();
  });

  it("maps manage deadline snapshots when populated", async () => {
    getTeamsMock.mockResolvedValue({
      project: { id: 3, name: "P", moduleId: 1 },
      teams: [{ id: 1, teamName: "Alpha", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getManageMock.mockResolvedValue({
      ...emptyManageSummary,
      projectDeadline: {
        taskOpenDate: "2026-04-01T09:00:00.000Z",
        taskDueDate: "2026-04-08T09:00:00.000Z",
        taskDueDateMcf: "2026-04-15T09:00:00.000Z",
        assessmentOpenDate: "2026-04-09T09:00:00.000Z",
        assessmentDueDate: "2026-04-16T09:00:00.000Z",
        assessmentDueDateMcf: "2026-04-23T09:00:00.000Z",
        feedbackOpenDate: "2026-04-17T09:00:00.000Z",
        feedbackDueDate: "2026-04-24T09:00:00.000Z",
        feedbackDueDateMcf: "2026-05-01T09:00:00.000Z",
        teamAllocationQuestionnaireOpenDate: "2026-03-20T09:00:00.000Z",
        teamAllocationQuestionnaireDueDate: "2026-03-27T09:00:00.000Z",
      },
    });

    const page = await StaffProjectTeamsPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);

    expect(screen.getByRole("heading", { name: /Deadlines and Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit text/i })).toHaveAttribute("href", "/staff/projects/3/manage");
  });
});
