import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getStaffTeamHealthMessages } from "@/features/projects/api/client";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffProjectTeamTabsPage from "./page";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffTeamHealthMessages: vi.fn(),
}));

vi.mock("@/features/staff/meetings/api/client", () => ({
  listTeamMeetings: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getStaffTeamHealthMessagesMock = vi.mocked(getStaffTeamHealthMessages);
const listTeamMeetingsMock = vi.mocked(listTeamMeetings);

const staffUser = { id: 10, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffProjectTeamTabsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-staff users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffProjectTeamTabsPage({ params: Promise.resolve({ projectId: "1", teamId: "2" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid route message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "x", teamId: "y" }),
    });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("renders project lookup error and fallback message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue("lookup failed");

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.getByText("Failed to load team data.")).toBeInTheDocument();
  });

  it("renders project lookup error message from Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("lookup exploded"));

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.getByText("lookup exploded")).toBeInTheDocument();
  });

  it("renders team-not-found message when project loads but team is missing", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 5, name: "Project", moduleId: 2 },
      teams: [{ id: 99, teamName: "Other", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
  });

  it("renders fallback summaries when health/messages requests fail", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 5, name: "Project", moduleId: 2 },
      teams: [
        {
          id: 6,
          teamName: "Team Six",
          allocations: [],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getStaffTeamHealthMessagesMock.mockRejectedValue(new Error("health fetch failed"));
    listTeamMeetingsMock.mockRejectedValue(new Error("meetings fetch failed"));

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.getByText("Review risk indicators and support requests in the team health view.")).toBeInTheDocument();
    expect(screen.getByText("Meeting activity signals are available in the team health view.")).toBeInTheDocument();
    expect(screen.getByText("No students assigned yet.")).toBeInTheDocument();
  });

  it("renders team summary counts, latest meeting label, and member avatars", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 5, name: "Project", moduleId: 2 },
      teams: [
        {
          id: 6,
          teamName: "Team Six",
          allocations: [
            {
              userId: 101,
              user: { firstName: "Alice", lastName: "Roe", email: "alice@example.com" },
            },
            {
              userId: 102,
              user: { firstName: "", lastName: "", email: "unknown@example.com" },
            },
          ],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getStaffTeamHealthMessagesMock.mockResolvedValue([
      { id: 1, resolved: false },
      { id: 2, resolved: false },
      { id: 3, resolved: true },
    ] as Awaited<ReturnType<typeof getStaffTeamHealthMessages>>);
    listTeamMeetingsMock.mockResolvedValue([
      { id: 1, date: "invalid-date" },
      { id: 2, date: "2026-03-15T10:00:00.000Z" },
      { id: 3, date: "2026-03-01T10:00:00.000Z" },
    ] as Awaited<ReturnType<typeof listTeamMeetings>>);

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.getByText("2 open support requests.")).toBeInTheDocument();
    expect(screen.getByText(/3 meetings recorded · Last meeting/)).toBeInTheDocument();
    expect(screen.getByText("Alice Roe")).toBeInTheDocument();
    expect(screen.getByText("unknown@example.com")).toBeInTheDocument();
    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders singular summaries and no latest meeting label when only invalid dates exist", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 5, name: "Project", moduleId: 2 },
      teams: [
        {
          id: 6,
          teamName: "Team Six",
          allocations: [
            {
              userId: 101,
              user: { firstName: "Alice", lastName: "Roe", email: "alice@example.com" },
            },
          ],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getStaffTeamHealthMessagesMock.mockResolvedValue([
      { id: 1, resolved: false },
    ] as Awaited<ReturnType<typeof getStaffTeamHealthMessages>>);
    listTeamMeetingsMock.mockResolvedValue([
      { id: 1, date: "invalid-date" },
    ] as Awaited<ReturnType<typeof listTeamMeetings>>);

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.getByText("1 open support request.")).toBeInTheDocument();
    expect(screen.getByText("1 meeting recorded.")).toBeInTheDocument();
    expect(screen.queryByText(/Last meeting/)).not.toBeInTheDocument();
  });
});
