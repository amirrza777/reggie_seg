import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamHealthMessages, getStaffTeamWarnings } from "@/features/projects/api/client";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { getStudentDetails, getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getLatestProjectGithubSnapshot, listProjectGithubRepoLinks } from "@/features/github/api/client";
import { getFeedbackReviewStatuses, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
import { getTeamBoard } from "@/features/trello/api/client";
import { countCardsByStatus } from "@/features/trello/lib/velocity";
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
  getStudentDetails: vi.fn(),
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

vi.mock("@/features/trello/api/client", () => ({
  getTeamBoard: vi.fn(),
}));

vi.mock("@/features/trello/lib/velocity", () => ({
  countCardsByStatus: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getStaffTeamHealthMessagesMock = vi.mocked(getStaffTeamHealthMessages);
const getStaffTeamWarningsMock = vi.mocked(getStaffTeamWarnings);
const listTeamMeetingsMock = vi.mocked(listTeamMeetings);
const getTeamDetailsMock = vi.mocked(getTeamDetails);
const getStudentDetailsMock = vi.mocked(getStudentDetails);
const listProjectGithubRepoLinksMock = vi.mocked(listProjectGithubRepoLinks);
const getLatestProjectGithubSnapshotMock = vi.mocked(getLatestProjectGithubSnapshot);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);
const getFeedbackReviewStatusesMock = vi.mocked(getFeedbackReviewStatuses);
const getTeamBoardMock = vi.mocked(getTeamBoard);
const countCardsByStatusMock = vi.mocked(countCardsByStatus);

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
    getStudentDetailsMock.mockResolvedValue({
      studentMarking: { mark: 70 },
    } as Awaited<ReturnType<typeof getStudentDetails>>);
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
    getTeamBoardMock.mockResolvedValue({ ok: false, requireJoin: false } as Awaited<ReturnType<typeof getTeamBoard>>);
    countCardsByStatusMock.mockReturnValue({ completed: 0, total: 0 } as ReturnType<typeof countCardsByStatus>);
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
      "/staff/projects/5/teams/6/grading/student/101",
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

  it("renders computed member percentages, commit fallback, and mixed mark results", async () => {
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
              user: { firstName: "Bob", lastName: "Yen", email: "bob@example.com" },
            },
          ],
        },
        {
          id: 7,
          teamName: "Team Seven",
          allocations: [
            {
              userId: 201,
              user: { firstName: "Cara", lastName: "Lee", email: "cara@example.com" },
            },
          ],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    getTeamDetailsMock
      .mockResolvedValueOnce({
        module: { id: 2, title: "Module", archivedAt: null },
        team: { id: 6, title: "Team Six" },
        students: [
          { id: 101, submitted: "1", expected: "2" },
          { id: 102, submitted: "0", expected: "0" },
        ],
        teamMarking: null,
      } as any)
      .mockResolvedValueOnce({
        module: { id: 2, title: "Module", archivedAt: null },
        team: { id: 6, title: "Team Six" },
        students: [{ id: 101, submitted: 1, expected: 2 }, { id: 102, submitted: 0, expected: 1 }],
        teamMarking: null,
      } as any)
      .mockResolvedValueOnce({
        module: { id: 2, title: "Module", archivedAt: null },
        team: { id: 7, title: "Team Seven" },
        students: [{ id: 201, submitted: 1, expected: 1 }],
        teamMarking: null,
      } as any);

    getStudentDetailsMock
      .mockRejectedValueOnce(new Error("mark lookup failed"))
      .mockResolvedValueOnce({ studentMarking: { mark: 86 } } as any);

    getPeerAssessmentsForUserMock.mockImplementation(async (userId) => {
      if (String(userId) === "101") return [{ id: 9001 }, { id: 9002 }] as any;
      if (String(userId) === "102") return [{ id: 9003 }] as any;
      return [] as any;
    });
    getFeedbackReviewStatusesMock.mockResolvedValue({ "9001": true, "9002": false, "9003": true });

    listProjectGithubRepoLinksMock.mockRejectedValueOnce(new Error("repo links unavailable"));
    getStaffTeamWarningsMock.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);
    listTeamMeetingsMock.mockResolvedValue([
      {
        id: 1,
        date: "2026-03-12T10:00:00.000Z",
        attendances: [
          { userId: 101, status: "present" },
          { userId: 102, status: "absent" },
        ],
      },
    ] as any);

    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: { cardsByList: {}, listNamesById: {} },
      sectionConfig: {},
    } as any);
    countCardsByStatusMock.mockReturnValue({ completed: 3, total: 10 } as any);

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.getByLabelText("Team versus project average metrics")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Assessment\s*50%/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Feedback\s*50%/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Final mark\s*--/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Final mark\s*86/i })).toBeInTheDocument();
  });

  it("falls back to no comparison card when trello aggregation throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 5, name: "Project", moduleId: 2 },
      teams: [
        {
          id: 6,
          teamName: "Team Six",
          allocations: [{ userId: 101, user: { firstName: "Alice", lastName: "Roe", email: "alice@example.com" } }],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: { cardsByList: {}, listNamesById: {} },
      sectionConfig: {},
    } as any);
    countCardsByStatusMock.mockImplementation(() => {
      throw new Error("trello metrics failed");
    });

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.queryByLabelText("Team versus project average metrics")).not.toBeInTheDocument();
  });

  it("handles initial team-details lookup failure and still renders the page", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 5, name: "Project", moduleId: 2 },
      teams: [
        {
          id: 6,
          teamName: "Team Six",
          allocations: [{ userId: 101, user: { firstName: "Alice", lastName: "Roe", email: "alice@example.com" } }],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    getTeamDetailsMock.mockRejectedValueOnce(new Error("initial team details failed"));

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "5", teamId: "6" }),
    });
    render(page);

    expect(screen.getByText("Team members")).toBeInTheDocument();
    expect(screen.getByText("Alice Roe")).toBeInTheDocument();
  });
});
