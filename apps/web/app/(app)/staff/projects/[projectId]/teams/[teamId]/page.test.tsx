import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamHealthMessages, getStaffTeamWarnings } from "@/features/projects/api/client";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getLatestProjectGithubSnapshot, listProjectGithubRepoLinks } from "@/features/github/api/client";
import { getFeedbackReviewStatuses, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffProjectTeamTabsPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffTeamHealthMessages: vi.fn(),
  getStaffTeamWarnings: vi.fn(),
}));

vi.mock("@/features/staff/meetings/api/client", () => ({
  listTeamMeetings: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getTeamDetails: vi.fn(),
}));

vi.mock("@/features/github/api/client", () => ({
  listProjectGithubRepoLinks: vi.fn(),
  getLatestProjectGithubSnapshot: vi.fn(),
}));

vi.mock("@/features/peerFeedback/api/client", () => ({
  getPeerAssessmentsForUser: vi.fn(),
  getFeedbackReviewStatuses: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getStaffTeamHealthMessagesMock = vi.mocked(getStaffTeamHealthMessages);
const getStaffTeamWarningsMock = vi.mocked(getStaffTeamWarnings);
const listTeamMeetingsMock = vi.mocked(listTeamMeetings);
const getTeamDetailsMock = vi.mocked(getTeamDetails);
const listProjectGithubRepoLinksMock = vi.mocked(listProjectGithubRepoLinks);
const getLatestProjectGithubSnapshotMock = vi.mocked(getLatestProjectGithubSnapshot);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);
const getFeedbackReviewStatusesMock = vi.mocked(getFeedbackReviewStatuses);

const staffUser = { id: 10, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffProjectTeamTabsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStaffTeamHealthMessagesMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffTeamHealthMessages>>);
    getStaffTeamWarningsMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffTeamWarnings>>);
    getTeamDetailsMock.mockResolvedValue({
      module: { id: 2, title: "Module", archivedAt: null },
      team: { id: 1, title: "Team" },
      students: [],
      teamMarking: null,
    } as Awaited<ReturnType<typeof getTeamDetails>>);
    listProjectGithubRepoLinksMock.mockResolvedValue([]);
    getLatestProjectGithubSnapshotMock.mockResolvedValue({
      snapshot: {
        id: 1,
        analysedAt: "2026-01-01T00:00:00.000Z",
        userStats: [],
        repoStats: [],
      },
    });
    getPeerAssessmentsForUserMock.mockResolvedValue([]);
    getFeedbackReviewStatusesMock.mockResolvedValue({});
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

    expect(screen.getByText("Use the tabs above to open peer assessment, peer feedback, repositories, meetings, and trello.")).toBeInTheDocument();
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

    expect(screen.getByLabelText("Team versus project average metrics")).toBeInTheDocument();
    expect(screen.getByText("Alice Roe")).toBeInTheDocument();
    expect(screen.getByText("unknown@example.com")).toBeInTheDocument();
    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Final mark/i })[0]).toHaveAttribute(
      "href",
      "/staff/peer-assessments/module/2/team/6/student/101",
    );
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

    expect(screen.getByLabelText("Team versus project average metrics")).toBeInTheDocument();
  });
});
