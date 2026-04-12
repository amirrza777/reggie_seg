import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import StaffTeamGradingSectionPage from "./page";

const staffMarkingCardMock = vi.fn(() => <div data-testid="staff-marking-card" />);
const markingStudentListMock = vi.fn(() => <div data-testid="marking-student-list" />);

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getTeamDetails: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/components/StaffMarkingCard", () => ({
  StaffMarkingCard: (props: unknown) => staffMarkingCardMock(props),
}));

vi.mock("./MarkingStudentList", () => ({
  MarkingStudentList: (props: unknown) => markingStudentListMock(props),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getTeamDetailsMock = vi.mocked(getTeamDetails);

const staffUser = { id: 3, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffTeamGradingSectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invalid route message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "x", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("renders project lookup default error for non-Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue("project failed");

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("Failed to load project team data.")).toBeInTheDocument();
  });

  it("renders project lookup error message for Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("project failed hard"));

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("project failed hard")).toBeInTheDocument();
  });

  it("renders team not found fallback", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 20, moduleArchivedAt: null },
      teams: [{ id: 99, teamName: "Other", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
  });

  it("renders grading error section for Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 20, moduleArchivedAt: null },
      teams: [{ id: 2, teamName: "Team 2", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockRejectedValue(new Error("grading failed"));

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("grading failed")).toBeInTheDocument();
  });

  it("renders grading default error for non-Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 20, moduleArchivedAt: null },
      teams: [{ id: 2, teamName: "Team 2", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockRejectedValue("grading failed");

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("Failed to load grading data.")).toBeInTheDocument();
  });

  it("renders not-graded summary and editable props", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 20, moduleArchivedAt: null },
      teams: [{ id: 2, teamName: "Team 2", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockResolvedValue({
      teamMarking: null,
      students: [{ id: 21, title: "Alice Roe" }],
    } as Awaited<ReturnType<typeof getTeamDetails>>);

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText("Not graded yet")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(staffMarkingCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        staffId: 3,
        moduleId: 20,
        teamId: 2,
        initialMarking: null,
        readOnly: false,
      }),
    );
    expect(markingStudentListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        students: [{ id: 21, title: "Alice Roe" }],
        projectId: 1,
        teamId: 2,
        readOnly: false,
      }),
    );
  });

  it("renders archived read-only summary and unknown-time fallback", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 20, moduleArchivedAt: "2026-03-01T00:00:00.000Z" },
      teams: [{ id: 2, teamName: "Team 2", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockResolvedValue({
      teamMarking: { mark: 77, updatedAt: "invalid-date" },
      students: [],
    } as Awaited<ReturnType<typeof getTeamDetails>>);

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("77")).toBeInTheDocument();
    expect(screen.getByText("Unknown time")).toBeInTheDocument();
    expect(staffMarkingCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        readOnly: true,
      }),
    );
    expect(markingStudentListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        readOnly: true,
      }),
    );
  });

  it("formats valid updatedAt values using stable UTC output", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 20, moduleArchivedAt: null },
      teams: [{ id: 2, teamName: "Team 2", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockResolvedValue({
      teamMarking: { mark: 65, updatedAt: "2026-04-01T12:34:56.000Z" },
      students: [],
    } as Awaited<ReturnType<typeof getTeamDetails>>);

    const page = await StaffTeamGradingSectionPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText(/UTC/)).toBeInTheDocument();
  });
});
