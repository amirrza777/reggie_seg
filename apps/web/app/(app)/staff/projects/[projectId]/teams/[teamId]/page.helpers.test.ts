import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  average,
  formatCount,
  formatMessageDate,
  formatPercent,
  getAssessmentCompletion,
  getAttendanceRate,
  getInitials,
  getMemberAttendancePercentByUserId,
  loadMemberFeedbackProgress,
  loadProjectCommitTotalsByTeam,
  percentage,
} from "./page.helpers";
import { getLatestProjectGithubSnapshot, listProjectGithubRepoLinks } from "@/features/github/api/client";
import { getFeedbackReviewStatuses, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";

vi.mock("@/features/github/api/client", () => ({
  listProjectGithubRepoLinks: vi.fn(),
  getLatestProjectGithubSnapshot: vi.fn(),
}));

vi.mock("@/features/peerFeedback/api/client", () => ({
  getPeerAssessmentsForUser: vi.fn(),
  getFeedbackReviewStatuses: vi.fn(),
}));

const listProjectGithubRepoLinksMock = vi.mocked(listProjectGithubRepoLinks);
const getLatestProjectGithubSnapshotMock = vi.mocked(getLatestProjectGithubSnapshot);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);
const getFeedbackReviewStatusesMock = vi.mocked(getFeedbackReviewStatuses);

describe("team page helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles basic formatting and percentage helper cases", () => {
    expect(getInitials("Ayan", "Mamun")).toBe("AM");
    expect(getInitials(" ", " ")).toBe("?");

    expect(average([10, null, 20, Number.NaN])).toBe(15);
    expect(average([null, null])).toBeNull();

    expect(formatCount(1234)).toBe("1,234");
    expect(formatCount(null)).toBe("—");
    expect(formatPercent(87)).toBe("87%");
    expect(formatPercent(null)).toBe("—");

    expect(percentage(5, 10)).toBe(50);
    expect(percentage(-1, 10)).toBe(0);
    expect(percentage(5, 0)).toBe(0);
  });

  it("computes attendance and assessment metrics", () => {
    expect(
      getAttendanceRate([
        { attendances: [{ status: "present" }, { status: "late" }, { status: "absent" }] },
        { attendances: [{ status: "on_time" }] },
        { attendances: null },
      ] as any),
    ).toBe(75);
    expect(getAttendanceRate([] as any)).toBeNull();

    expect(
      getAssessmentCompletion([
        { expected: 4, submitted: 3 },
        { expected: 0, submitted: 0 },
        { expected: 2, submitted: 2 },
      ] as any),
    ).toBe(83);
    expect(getAssessmentCompletion([{ expected: 0, submitted: 0 }] as any)).toBe(0);
  });

  it("builds member attendance percentages by user id", () => {
    const result = getMemberAttendancePercentByUserId([
      {
        attendances: [
          { userId: 1, status: "present" },
          { userId: 1, status: "absent" },
          { userId: 2, status: "on_time" },
        ],
      },
      {
        attendances: [
          { userId: 1, status: "late" },
          { userId: 2, status: "absent" },
        ],
      },
    ] as any);

    expect(result.get(1)).toBe(67);
    expect(result.get(2)).toBe(50);
  });

  it("loads member feedback progress and falls back when status loading fails", async () => {
    getPeerAssessmentsForUserMock.mockImplementation(async (memberId) => {
      if (memberId === "1") {
        return [{ id: 11 }, { id: 12 }] as any;
      }
      throw new Error("no assignments");
    });
    getFeedbackReviewStatusesMock.mockResolvedValueOnce({ "11": true, "12": false } as any);

    const progress = await loadMemberFeedbackProgress(22, [1, 2]);
    expect(progress.get(1)).toEqual({ assigned: 2, completed: 1 });
    expect(progress.get(2)).toEqual({ assigned: 0, completed: 0 });
    expect(getFeedbackReviewStatusesMock).toHaveBeenCalledWith(["11", "12"]);

    getFeedbackReviewStatusesMock.mockRejectedValueOnce(new Error("status down"));
    const fallback = await loadMemberFeedbackProgress(22, [1]);
    expect(fallback.get(1)).toEqual({ assigned: 2, completed: 0 });
  });

  it("loads commit totals with all snapshot fallback sources and rejected snapshots", async () => {
    const teamUserIdsByTeamId = new Map<number, Set<number>>([
      [10, new Set([1, 2])],
      [11, new Set()],
    ]);

    listProjectGithubRepoLinksMock.mockResolvedValueOnce([] as any);
    const empty = await loadProjectCommitTotalsByTeam(22, teamUserIdsByTeamId);
    expect(empty.get(10)).toBe(0);
    expect(empty.get(11)).toBe(0);

    listProjectGithubRepoLinksMock.mockResolvedValueOnce(
      [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] as any,
    );
    getLatestProjectGithubSnapshotMock.mockImplementation(async (repoLinkId: number) => {
      if (repoLinkId === 1) {
        return {
          snapshot: {
            data: { branchScopeStats: { defaultBranch: { totalCommits: 5 } } },
            repoStats: [{ totalCommits: 999 }],
          },
        } as any;
      }
      if (repoLinkId === 2) {
        return {
          snapshot: {
            data: { branchScopeStats: { defaultBranch: { totalCommits: -1 } } },
            repoStats: [{ totalCommits: 3 }],
          },
        } as any;
      }
      if (repoLinkId === 3) {
        return {
          snapshot: {
            data: { branchScopeStats: { allBranches: { totalCommits: 7 } } },
            repoStats: [],
          },
        } as any;
      }
      if (repoLinkId === 4) {
        return {
          snapshot: {
            data: {},
            repoStats: [],
          },
        } as any;
      }
      throw new Error("snapshot unavailable");
    });

    const totals = await loadProjectCommitTotalsByTeam(22, teamUserIdsByTeamId);
    expect(totals.get(10)).toBe(15);
    expect(totals.get(11)).toBe(0);
  });

  it("formats message dates with valid and invalid values", () => {
    expect(formatMessageDate("not-a-date")).toBe("Unknown date");
    expect(formatMessageDate("2026-04-14T10:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
