import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffProjectTeamDeadlinesPage from "./page";

const deadlineProfileControlMock = vi.fn(() => <div data-testid="deadline-profile-control" />);
const deadlineOverridesPanelMock = vi.fn(() => <div data-testid="deadline-overrides-panel" />);

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffTeamDeadlineProfileControl", () => ({
  StaffTeamDeadlineProfileControl: (props: unknown) => deadlineProfileControlMock(props),
}));

vi.mock("@/features/staff/projects/components/StaffStudentDeadlineOverridesPanel", () => ({
  StaffStudentDeadlineOverridesPanel: (props: unknown) => deadlineOverridesPanelMock(props),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

const staffUser = { id: 7, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffProjectTeamDeadlinesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invalid route message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    const page = await StaffProjectTeamDeadlinesPage({
      params: Promise.resolve({ projectId: "x", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("renders project lookup error and fallback message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue("lookup failed");

    const page = await StaffProjectTeamDeadlinesPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("Failed to load team data.")).toBeInTheDocument();
  });

  it("renders project lookup error message from Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("lookup failed hard"));

    const page = await StaffProjectTeamDeadlinesPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("lookup failed hard")).toBeInTheDocument();
  });

  it("renders team-not-found message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 3 },
      teams: [{ id: 99, teamName: "Other", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectTeamDeadlinesPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
    });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
  });

  it("passes read-only MCF props and valid student search param", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 3, moduleArchivedAt: "2026-01-01T00:00:00.000Z" },
      teams: [
        {
          id: 2,
          deadlineProfile: "MCF",
          allocations: [
            {
              user: { id: 21, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
            },
          ],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectTeamDeadlinesPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
      searchParams: Promise.resolve({ studentId: "21" }),
    });
    render(page);

    expect(deadlineProfileControlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 2,
        initialProfile: "MCF",
        readOnly: true,
      }),
    );
    expect(deadlineOverridesPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 1,
        initialStudentId: 21,
        readOnly: true,
        members: [
          {
            id: 21,
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
          },
        ],
      }),
    );
    expect(screen.getByText("MCF extended")).toBeInTheDocument();
  });

  it("passes standard editable props with invalid student query fallback", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "Project", moduleId: 3, moduleArchivedAt: null },
      teams: [
        {
          id: 2,
          deadlineProfile: "STANDARD",
          allocations: [
            {
              user: { id: 31, firstName: "Bob", lastName: "Yeo", email: "bob@example.com" },
            },
          ],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectTeamDeadlinesPage({
      params: Promise.resolve({ projectId: "1", teamId: "2" }),
      searchParams: Promise.resolve({ studentId: "abc" }),
    });
    render(page);

    expect(deadlineProfileControlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 2,
        initialProfile: "STANDARD",
        readOnly: false,
      }),
    );
    expect(deadlineOverridesPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialStudentId: null,
        readOnly: false,
      }),
    );
    expect(screen.getByText("Standard")).toBeInTheDocument();
  });
});
