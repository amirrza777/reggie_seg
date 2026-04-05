import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getStaffTeamHealthMessages, getStaffTeamWarnings } from "@/features/projects/api/client";
import { listMeetings } from "@/features/meetings/api/client";
import { listProjectGithubRepoLinks, getLatestProjectGithubSnapshot } from "@/features/github/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import StaffTeamHealthPage from "./page";

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

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffTeamHealthMessages: vi.fn(),
  getStaffTeamWarnings: vi.fn(),
}));

vi.mock("@/features/meetings/api/client", () => ({
  listMeetings: vi.fn(),
}));

vi.mock("@/features/github/api/client", () => ({
  listProjectGithubRepoLinks: vi.fn(),
  getLatestProjectGithubSnapshot: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getTeamDetails: vi.fn(),
}));

const warningPanelMock = vi.fn((props: Record<string, unknown>) => (
  <div
    data-testid="warning-panel"
    data-initial-warning-count={String((props.initialWarnings as unknown[]).length)}
    data-initial-error={String(props.initialError ?? "")}
  />
));

vi.mock("@/features/staff/projects/components/StaffTeamWarningReviewPanel", () => ({
  StaffTeamWarningReviewPanel: (props: Record<string, unknown>) => warningPanelMock(props),
}));

const messagePanelMock = vi.fn((props: Record<string, unknown>) => (
  <div
    data-testid="message-panel"
    data-initial-request-count={String((props.initialRequests as unknown[]).length)}
    data-initial-error={String(props.initialError ?? "")}
  />
));

vi.mock("@/features/staff/projects/components/StaffTeamHealthMessageReviewPanel", () => ({
  StaffTeamHealthMessageReviewPanel: (props: Record<string, unknown>) => messagePanelMock(props),
}));

vi.mock("@/features/staff/projects/components/StaffSignalLookbackSelect", () => ({
  StaffSignalLookbackSelect: ({ value }: { value: string }) => (
    <div data-testid="signal-lookback-select" data-value={value} />
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getStaffTeamHealthMessagesMock = vi.mocked(getStaffTeamHealthMessages);
const getStaffTeamWarningsMock = vi.mocked(getStaffTeamWarnings);
const listMeetingsMock = vi.mocked(listMeetings);
const listProjectGithubRepoLinksMock = vi.mocked(listProjectGithubRepoLinks);
const getLatestProjectGithubSnapshotMock = vi.mocked(getLatestProjectGithubSnapshot);
const getTeamDetailsMock = vi.mocked(getTeamDetails);

const staffUser = { id: 9, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffTeamHealthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 22, name: "Project 22", moduleId: 3 },
      teams: [
        {
          id: 58,
          teamName: "Team 58",
          allocations: [{ userId: 1001 }, { userId: 1002 }],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getStaffTeamHealthMessagesMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffTeamHealthMessages>>);
    getStaffTeamWarningsMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffTeamWarnings>>);
    listMeetingsMock.mockResolvedValue([] as Awaited<ReturnType<typeof listMeetings>>);
    listProjectGithubRepoLinksMock.mockResolvedValue([] as Awaited<ReturnType<typeof listProjectGithubRepoLinks>>);
    getLatestProjectGithubSnapshotMock.mockResolvedValue({
      snapshot: {
        id: 1,
        analysedAt: "2026-04-01T00:00:00.000Z",
        userStats: [],
        repoStats: [],
      },
    } as Awaited<ReturnType<typeof getLatestProjectGithubSnapshot>>);
    getTeamDetailsMock.mockResolvedValue({
      module: { id: 3, title: "Module", archivedAt: null },
      team: { id: 58, title: "Team 58" },
      students: [],
      teamMarking: null,
    } as Awaited<ReturnType<typeof getTeamDetails>>);
  });

  it("redirects non-staff users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as any);

    await expect(
      StaffTeamHealthPage({ params: Promise.resolve({ projectId: "22", teamId: "58" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid route message for non-numeric params", async () => {
    const page = await StaffTeamHealthPage({ params: Promise.resolve({ projectId: "x", teamId: "y" }) });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("renders fallback project error for non-Error throws", async () => {
    getStaffProjectTeamsMock.mockRejectedValue("boom");

    const page = await StaffTeamHealthPage({ params: Promise.resolve({ projectId: "22", teamId: "58" }) });
    render(page);

    expect(screen.getByText("Failed to load project team data.")).toBeInTheDocument();
  });

  it("renders specific project error for Error throws", async () => {
    getStaffProjectTeamsMock.mockRejectedValue(new Error("lookup exploded"));

    const page = await StaffTeamHealthPage({ params: Promise.resolve({ projectId: "22", teamId: "58" }) });
    render(page);

    expect(screen.getByText("lookup exploded")).toBeInTheDocument();
  });

  it("renders team-not-found state", async () => {
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 22, name: "Project 22", moduleId: 3 },
      teams: [{ id: 999, teamName: "Other", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffTeamHealthPage({ params: Promise.resolve({ projectId: "22", teamId: "58" }) });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to project teams" })).toHaveAttribute("href", "/staff/projects/22");
  });

  it("renders summary sections and passes warnings/messages to child panels", async () => {
    getStaffTeamHealthMessagesMock.mockResolvedValue([
      { id: 1, resolved: false, createdAt: "2026-04-01T10:00:00.000Z", updatedAt: "2026-04-02T10:00:00.000Z", responseText: "" },
      { id: 2, resolved: true, createdAt: "2026-04-01T09:00:00.000Z", updatedAt: "2026-04-03T11:00:00.000Z", responseText: "done" },
    ] as Awaited<ReturnType<typeof getStaffTeamHealthMessages>>);

    getStaffTeamWarningsMock.mockResolvedValue([
      { id: 1, active: true, severity: "HIGH", createdAt: "2026-04-01T08:00:00.000Z", updatedAt: "2026-04-02T08:00:00.000Z" },
      { id: 2, active: false, severity: "MEDIUM", createdAt: "2026-03-20T08:00:00.000Z", updatedAt: "2026-03-22T08:00:00.000Z", resolvedAt: "2026-03-22T08:00:00.000Z" },
    ] as Awaited<ReturnType<typeof getStaffTeamWarnings>>);

    listMeetingsMock.mockResolvedValue([
      {
        id: 44,
        date: "2026-04-01T10:00:00.000Z",
        attendances: [{ status: "present" }],
        minutes: { content: "Agenda done" },
      },
    ] as Awaited<ReturnType<typeof listMeetings>>);

    getTeamDetailsMock.mockResolvedValue({
      module: { id: 3, title: "Module", archivedAt: null },
      team: { id: 58, title: "Team 58" },
      students: [
        { expected: 4, submitted: 2 },
        { expected: 4, submitted: 4 },
      ],
      teamMarking: null,
    } as Awaited<ReturnType<typeof getTeamDetails>>);

    const page = await StaffTeamHealthPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
      searchParams: Promise.resolve({ lookback: "7" }),
    });
    render(page);

    expect(screen.getByText("Signals and diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Active warnings")).toBeInTheDocument();
    expect(screen.getByText("Unresolved messages")).toBeInTheDocument();
    expect(screen.getByText("Total issues")).toBeInTheDocument();

    expect(screen.getByTestId("signal-lookback-select")).toHaveAttribute("data-value", "7");

    expect(warningPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        projectId: 22,
        teamId: 58,
        initialWarnings: expect.arrayContaining([expect.objectContaining({ id: 1 })]),
        initialError: null,
      }),
    );

    expect(messagePanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        projectId: 22,
        teamId: 58,
        initialRequests: expect.arrayContaining([expect.objectContaining({ id: 1 })]),
        initialError: null,
      }),
    );
  });

  it("surfaces per-source signal errors when data loaders reject", async () => {
    getStaffTeamHealthMessagesMock.mockRejectedValue(new Error("messages failed"));
    getStaffTeamWarningsMock.mockRejectedValue(new Error("warnings failed"));
    listMeetingsMock.mockRejectedValue(new Error("meetings failed"));
    listProjectGithubRepoLinksMock.mockRejectedValue(new Error("repo failed"));
    getTeamDetailsMock.mockRejectedValue(new Error("peer failed"));

    const page = await StaffTeamHealthPage({ params: Promise.resolve({ projectId: "22", teamId: "58" }) });
    render(page);

    expect(screen.getByText("Repository signal error: repo failed")).toBeInTheDocument();
    expect(screen.getByText("Meeting signal error: meetings failed")).toBeInTheDocument();
    expect(screen.getByText("Peer signal error: peer failed")).toBeInTheDocument();

    expect(screen.getByTestId("warning-panel")).toHaveAttribute("data-initial-error", "warnings failed");
    expect(screen.getByTestId("message-panel")).toHaveAttribute("data-initial-error", "messages failed");
  });

  it("uses fallback signal-error messages when rejected values are not Error instances", async () => {
    getStaffTeamHealthMessagesMock.mockRejectedValue("x");
    getStaffTeamWarningsMock.mockRejectedValue("y");
    listMeetingsMock.mockRejectedValue("z");
    listProjectGithubRepoLinksMock.mockRejectedValue("w");
    getTeamDetailsMock.mockRejectedValue("q");

    const page = await StaffTeamHealthPage({ params: Promise.resolve({ projectId: "22", teamId: "58" }) });
    render(page);

    expect(screen.getByText("Repository signal error: Failed to load repository signals.")).toBeInTheDocument();
    expect(screen.getByText("Meeting signal error: Failed to load meeting signals.")).toBeInTheDocument();
    expect(screen.getByText("Peer signal error: Failed to load peer-assessment signals.")).toBeInTheDocument();

    expect(screen.getByTestId("warning-panel")).toHaveAttribute("data-initial-error", "Failed to load warning signals.");
    expect(screen.getByTestId("message-panel")).toHaveAttribute("data-initial-error", "Failed to load support requests.");
  });

  it("falls back to createdAt timestamps when updated signals are unavailable", async () => {
    getStaffTeamHealthMessagesMock.mockResolvedValue([
      {
        id: 10,
        resolved: false,
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "invalid-date",
        responseText: "",
      },
    ] as Awaited<ReturnType<typeof getStaffTeamHealthMessages>>);
    getStaffTeamWarningsMock.mockResolvedValue([
      {
        id: 11,
        active: true,
        severity: "MEDIUM",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "invalid-date",
      },
    ] as Awaited<ReturnType<typeof getStaffTeamWarnings>>);
    listMeetingsMock.mockResolvedValue([
      { id: 1, date: "invalid-date", attendances: [], minutes: { content: "" } },
    ] as Awaited<ReturnType<typeof listMeetings>>);

    const page = await StaffTeamHealthPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
      searchParams: Promise.resolve({ lookback: "all" }),
    });
    render(page);

    expect(screen.getByTestId("signal-lookback-select")).toHaveAttribute("data-value", "all");
    expect(screen.getByText("Signals and diagnostics")).toBeInTheDocument();
  });

  it("uses default lookback of 30 when query is missing or unknown", async () => {
    const page = await StaffTeamHealthPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
      searchParams: Promise.resolve({ lookback: "invalid" }),
    });
    render(page);

    expect(screen.getByTestId("signal-lookback-select")).toHaveAttribute("data-value", "30");
  });

  it("aggregates repository signals from mapped team users, fallback repo stats, and ignores invalid entries", async () => {
    listProjectGithubRepoLinksMock.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
    ] as Awaited<ReturnType<typeof listProjectGithubRepoLinks>>);

    getLatestProjectGithubSnapshotMock.mockImplementation(async (repoLinkId) => {
      if (repoLinkId === 1) {
        return {
          snapshot: {
            id: 1,
            analysedAt: "2026-04-10T00:00:00.000Z",
            userStats: [
              {
                mappedUserId: 1001,
                commitsByDay: {
                  "2026-04-08": 2,
                  "2026-04-12": 5,
                  "2026-03-15": 1,
                  "2026-04-09": "not-a-number",
                  invalid: 3,
                },
              },
              { mappedUserId: null, commitsByDay: { "2026-04-08": 3 } },
            ],
            repoStats: [{ commitsByDay: { "2026-04-08": 99 } }],
          },
        } as Awaited<ReturnType<typeof getLatestProjectGithubSnapshot>>;
      }

      if (repoLinkId === 2) {
        return {
          snapshot: {
            id: 2,
            analysedAt: "2026-04-09T00:00:00.000Z",
            userStats: [{ mappedUserId: 9999, commitsByDay: { "2026-04-07": 7 } }],
            repoStats: [{ commitsByDay: { "2026-04-07": 3 } }],
          },
        } as Awaited<ReturnType<typeof getLatestProjectGithubSnapshot>>;
      }

      if (repoLinkId === 3) {
        return {
          snapshot: {
            id: 3,
            analysedAt: "2026-04-08T00:00:00.000Z",
            userStats: [{ mappedUserId: 9999, commitsByDay: { "2026-04-06": 2 } }],
            repoStats: [],
          },
        } as Awaited<ReturnType<typeof getLatestProjectGithubSnapshot>>;
      }

      throw new Error("snapshot unavailable");
    });

    const page = await StaffTeamHealthPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
      searchParams: Promise.resolve({ lookback: "7" }),
    });
    render(page);

    const contributionSection = screen.getByText("Contribution diagnostics").closest("article");
    expect(contributionSection).not.toBeNull();
    if (!contributionSection) return;

    expect(within(contributionSection).getByText(/^5$/)).toBeInTheDocument();
    expect(within(contributionSection).getByText(/^2$/)).toBeInTheDocument();
    expect(within(contributionSection).getByText("3/4")).toBeInTheDocument();
  });

  it("keeps repository contribution diagnostics empty when snapshots contain no usable commit data", async () => {
    listProjectGithubRepoLinksMock.mockResolvedValue([
      { id: 41 },
      { id: 42 },
    ] as Awaited<ReturnType<typeof listProjectGithubRepoLinks>>);

    getLatestProjectGithubSnapshotMock.mockResolvedValue({
      snapshot: {
        id: 41,
        analysedAt: "2026-04-10T00:00:00.000Z",
        userStats: [{ mappedUserId: 9999, commitsByDay: { "2026-04-08": 3 } }],
        repoStats: [],
      },
    } as Awaited<ReturnType<typeof getLatestProjectGithubSnapshot>>);

    const page = await StaffTeamHealthPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
      searchParams: Promise.resolve({ lookback: "all" }),
    });
    render(page);

    const contributionSection = screen.getByText("Contribution diagnostics").closest("article");
    expect(contributionSection).not.toBeNull();
    if (!contributionSection) return;

    expect(within(contributionSection).getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(within(contributionSection).getByText("2/2")).toBeInTheDocument();
  });
});
