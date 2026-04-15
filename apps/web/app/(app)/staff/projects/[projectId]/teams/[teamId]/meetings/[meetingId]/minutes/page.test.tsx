import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMeeting } from "@/features/meetings/api/client";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getCurrentUser } from "@/shared/auth/session";
import StaffMeetingMinutesPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/meetings/api/client", () => ({
  getMeeting: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getMeetingMock = vi.mocked(getMeeting);

function baseMeeting(overrides: Partial<Awaited<ReturnType<typeof getMeeting>>> = {}) {
  return {
    id: 5,
    teamId: 40,
    organiserId: 1,
    title: "Design review",
    subject: null,
    location: null,
    videoCallLink: null,
    agenda: null,
    date: "2026-02-01T14:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    organiser: { id: 1, firstName: "Pat", lastName: "Lee" },
    team: { enterpriseId: "e1", allocations: [] },
    participants: [],
    attendances: [],
    minutes: {
      id: 9,
      meetingId: 5,
      writerId: 2,
      writer: { id: 2, firstName: "Sam", lastName: "Taylor" },
      content: "Notes from the design review.",
      createdAt: "2026-02-01T15:00:00.000Z",
      updatedAt: "2026-02-01T15:00:00.000Z",
    },
    comments: [],
    ...overrides,
  } as Awaited<ReturnType<typeof getMeeting>>;
}

describe("StaffMeetingMinutesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 99, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 30, name: "P", moduleId: 1 },
      teams: [{ id: 40, teamName: "Team Orbit" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
  });

  it("renders minutes when staff can access the team and meeting", async () => {
    getMeetingMock.mockResolvedValue(baseMeeting());

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(getMeetingMock).toHaveBeenCalledWith(5);
    expect(screen.getByRole("heading", { name: "Design review" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to team meetings/i })).toHaveAttribute(
      "href",
      "/staff/projects/30/teams/40/team-meetings",
    );
    expect(screen.getByRole("heading", { name: "Attendance" })).toBeInTheDocument();
    expect(screen.getByText("No attendance has been recorded for this meeting.")).toBeInTheDocument();
    expect(screen.getByText("Notes from the design review.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Comments" })).toBeInTheDocument();
    expect(screen.getByText("No comments on this meeting.")).toBeInTheDocument();
  });

  it("renders read-only team comments when present", async () => {
    getMeetingMock.mockResolvedValue(
      baseMeeting({
        comments: [
          {
            id: 100,
            meetingId: 5,
            userId: 10,
            content: "Please review @Ann Alpha",
            createdAt: "2026-02-01T16:00:00.000Z",
            updatedAt: "2026-02-01T16:00:00.000Z",
            user: { id: 10, firstName: "Ann", lastName: "Alpha" },
          },
        ],
      }),
    );

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByRole("heading", { name: "Comments" })).toBeInTheDocument();
    expect(
      screen.getByText("Team comments are shown below. Staff cannot add or remove comments."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No comments on this meeting.")).not.toBeInTheDocument();
    expect(screen.getByText("Ann Alpha")).toBeInTheDocument();
    expect(screen.getByText(/Please review/)).toBeInTheDocument();
    expect(screen.getByText("@Ann Alpha")).toBeInTheDocument();
  });

  it("renders attendance stats and member rows when attendance exists", async () => {
    getMeetingMock.mockResolvedValue(
      baseMeeting({
        attendances: [
          {
            id: 1,
            meetingId: 5,
            userId: 10,
            status: "on_time",
            user: { id: 10, firstName: "Ann", lastName: "Alpha" },
          },
          {
            id: 2,
            meetingId: 5,
            userId: 11,
            status: "absent",
            user: { id: 11, firstName: "Ben", lastName: "Beta" },
          },
        ],
      }),
    );

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    const summary = screen.getByLabelText(/Attendance summary for this meeting/i);
    expect(within(summary).getByText("2")).toBeInTheDocument();
    expect(within(summary).getByText("50%")).toBeInTheDocument();
    expect(within(summary).getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Ann Alpha")).toBeInTheDocument();
    expect(screen.getByText("Ben Beta")).toBeInTheDocument();
    expect(screen.getByText("On time")).toBeInTheDocument();
    expect(screen.getByText("Absent")).toBeInTheDocument();
  });

  it("shows not found when meeting belongs to another team", async () => {
    getMeetingMock.mockResolvedValue(baseMeeting({ teamId: 999 }));

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByText("Meeting not found for this team.")).toBeInTheDocument();
  });

  it("shows empty minutes copy when there are no minutes", async () => {
    getMeetingMock.mockResolvedValue(baseMeeting({ minutes: null }));

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByText("No minutes have been recorded for this meeting.")).toBeInTheDocument();
  });

  it("shows signed-in message when there is no authenticated user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByText("You must be signed in to view meeting minutes.")).toBeInTheDocument();
  });

  it("shows invalid ID message when params are not numeric", async () => {
    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "abc", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByText("Invalid project, team, or meeting ID.")).toBeInTheDocument();
  });

  it("shows team not found when the team is not in the project", async () => {
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 30, name: "P", moduleId: 1 },
      teams: [],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
  });

  it("shows error message when project team fetch throws an Error instance", async () => {
    getStaffProjectTeamsMock.mockRejectedValue(new Error("service unavailable"));

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByText("service unavailable")).toBeInTheDocument();
  });

  it("shows error message when project team fetch throws a non-Error value", async () => {
    getStaffProjectTeamsMock.mockRejectedValue("unexpected failure");

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByText("Failed to load project team data.")).toBeInTheDocument();
  });

  it("shows meeting not found when getMeeting throws", async () => {
    getMeetingMock.mockRejectedValue(new Error("network error"));

    const page = await StaffMeetingMinutesPage({
      params: Promise.resolve({ projectId: "30", teamId: "40", meetingId: "5" }),
    });
    render(page);

    expect(screen.getByText("Meeting not found for this team.")).toBeInTheDocument();
  });
});
