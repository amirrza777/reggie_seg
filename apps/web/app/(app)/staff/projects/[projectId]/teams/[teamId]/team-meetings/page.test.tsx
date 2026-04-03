import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getTeamMeetingSettings, listTeamMeetings } from "@/features/staff/meetings/api/client";
import StaffTeamMeetingsSectionPage from "./page";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
  usePathname: vi.fn(() => "/staff/projects/30/teams/40/team-meetings"),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/staff/meetings/api/client", () => ({
  listTeamMeetings: vi.fn(),
  getTeamMeetingSettings: vi.fn(),
}));

vi.mock("@/features/staff/meetings/StaffMeetingsView", () => ({
  StaffMeetingsView: ({ meetings }: { meetings: unknown[] }) => <div data-testid="staff-meetings-view">{meetings.length}</div>,
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const listTeamMeetingsMock = vi.mocked(listTeamMeetings);
const getTeamMeetingSettingsMock = vi.mocked(getTeamMeetingSettings);

describe("StaffTeamMeetingsSectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeamMeetingSettingsMock.mockResolvedValue({ absenceThreshold: 3 });
  });

  it("redirects non-staff users to dashboard", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffTeamMeetingsSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "11" }) })
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid id message when route params are not numeric", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await StaffTeamMeetingsSectionPage({
      params: Promise.resolve({ projectId: "x", teamId: "z" }),
    });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("renders project/team lookup error message", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("project data failed"));

    const page = await StaffTeamMeetingsSectionPage({
      params: Promise.resolve({ projectId: "8", teamId: "9" }),
    });
    render(page);

    expect(screen.getByText("project data failed")).toBeInTheDocument();
  });

  it("renders default project/team lookup error for non-Error throws", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockRejectedValue("project data failed");

    const page = await StaffTeamMeetingsSectionPage({
      params: Promise.resolve({ projectId: "8", teamId: "9" }),
    });
    render(page);

    expect(screen.getByText("Failed to load project team data.")).toBeInTheDocument();
  });

  it("renders team-not-found fallback message", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 20, name: "Project Helios", moduleId: 7 },
      teams: [{ id: 99, teamName: "Team Other" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffTeamMeetingsSectionPage({
      params: Promise.resolve({ projectId: "20", teamId: "12" }),
    });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
  });

  it("renders meetings error when meeting list fetch fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 20, name: "Project Helios", moduleId: 7 },
      teams: [{ id: 12, teamName: "Team Sun" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    listTeamMeetingsMock.mockRejectedValue(new Error("meetings unavailable"));

    const page = await StaffTeamMeetingsSectionPage({
      params: Promise.resolve({ projectId: "20", teamId: "12" }),
    });
    render(page);

    expect(screen.getByText("meetings unavailable")).toBeInTheDocument();
  });

  it("renders default meetings error for non-Error failures", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 20, name: "Project Helios", moduleId: 7 },
      teams: [{ id: 12, teamName: "Team Sun" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    listTeamMeetingsMock.mockRejectedValue("meetings unavailable");

    const page = await StaffTeamMeetingsSectionPage({
      params: Promise.resolve({ projectId: "20", teamId: "12" }),
    });
    render(page);

    expect(screen.getByText("Failed to load meetings.")).toBeInTheDocument();
  });

  it("renders meetings view when project and meetings load successfully", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 30, name: "Project Apex", moduleId: 55 },
      teams: [{ id: 40, teamName: "Team Orbit" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    listTeamMeetingsMock.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }] as Awaited<ReturnType<typeof listTeamMeetings>>);

    const page = await StaffTeamMeetingsSectionPage({
      params: Promise.resolve({ projectId: "30", teamId: "40" }),
    });
    render(page);

    expect(screen.getByTestId("staff-meetings-view")).toHaveTextContent("3");
  });
});
