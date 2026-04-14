import { describe, expect, it } from "vitest";
import {
  buildBranchScopeCommitShareSeries,
  buildCommitTimelineSeries,
  buildCoverageShareSeries,
  buildLineChangesByDaySeries,
  formatWeekRangeLabel,
  getChartMinWidth,
  getContributorAxisWidth,
  getContributorWeeklyActivity,
  getDateTickInterval,
  getLineChangeDomain,
} from "./GithubRepoChartsDashboard.helpers";
import type { GithubLatestSnapshot } from "../types";

function makeSnapshot(overrides: Partial<GithubLatestSnapshot["snapshot"]>): GithubLatestSnapshot["snapshot"] {
  return {
    id: 1,
    analysedAt: "2026-03-21T12:00:00.000Z",
    data: null,
    userStats: [],
    repoStats: [],
    ...overrides,
  };
}

describe("GithubRepoChartsDashboard.helpers (additional)", () => {
  it("builds branch/mapping share series and generic chart sizing helpers", () => {
    expect(buildBranchScopeCommitShareSeries(makeSnapshot({ data: null }))).toEqual([]);
    expect(
      buildBranchScopeCommitShareSeries(
        makeSnapshot({
          data: {
            branchScopeStats: {
              defaultBranch: { branch: "main", totalCommits: 6, totalAdditions: 0, totalDeletions: 0 },
              allBranches: { totalCommits: 10, totalAdditions: 0, totalDeletions: 0 },
            },
          },
        }),
      ),
    ).toEqual([
      { name: "Default branch", value: 6, fill: "#2f81f7" },
      { name: "Other branches", value: 4, fill: "#22c55e" },
    ]);

    expect(buildCoverageShareSeries(null)).toEqual([]);
    expect(
      buildCoverageShareSeries({
        linkId: 1,
        snapshotId: 2,
        analysedAt: "2026-01-01T00:00:00.000Z",
        coverage: {
          totalContributors: 3,
          matchedContributors: 2,
          unmatchedContributors: 1,
          totalCommits: 10,
          unmatchedCommits: 4,
        },
      }),
    ).toEqual([
      { name: "Matched commits", value: 6, fill: "#22c55e" },
      { name: "Unmatched commits", value: 4, fill: "#f97316" },
    ]);

    expect(getLineChangeDomain([{ additions: 0, deletions: 0 }])).toBeUndefined();
    expect(getLineChangeDomain([{ additions: 30, deletions: -10 }])).toEqual([-30, 30]);
    expect(getChartMinWidth(1, { base: 200, pointWidth: 50, max: 300 })).toBe(200);
    expect(getDateTickInterval(6, { maxTicks: 12 })).toBe(0);
    expect(getDateTickInterval(20, { maxTicks: 10 })).toBe(1);
    expect(getContributorAxisWidth([])).toBe(140);
    expect(
      getContributorAxisWidth([
        {
          key: "a",
          rank: 1,
          name: "Very very long contributor name",
          login: null,
          commits: 1,
          additions: 1,
          deletions: 0,
          commitsByDay: {},
        },
      ]),
    ).toBeGreaterThan(140);
  });

  it("covers timeline edge trimming and invalid day-key bounds", () => {
    const sparseSeries = buildCommitTimelineSeries(
      makeSnapshot({
        repoStats: [
          {
            totalCommits: 0,
            totalAdditions: 0,
            totalDeletions: 0,
            totalContributors: 0,
            matchedContributors: 0,
            unmatchedContributors: 0,
            unmatchedCommits: 0,
            commitsByDay: {
              "2026-03-01": 0,
              "2026-03-02": 0,
            },
          },
        ],
      }),
      null,
    );
    expect(sparseSeries).toEqual([]);

    const invalidKeySeries = buildCommitTimelineSeries(
      makeSnapshot({
        repoStats: [
          {
            totalCommits: 2,
            totalAdditions: 0,
            totalDeletions: 0,
            totalContributors: 1,
            matchedContributors: 1,
            unmatchedContributors: 0,
            unmatchedCommits: 0,
            commitsByDay: {
              "": 2,
            } as Record<string, number>,
          },
        ],
      }),
      null,
    );
    expect(invalidKeySeries).toEqual([{ date: "", commits: 2, personalCommits: 0 }]);
  });

  it("covers empty and invalid contributor activity shapes", () => {
    expect(getContributorWeeklyActivity(null)).toEqual({ activeWeeks: 0, totalWeeks: 0, ratio: 0 });
    expect(getContributorWeeklyActivity({})).toEqual({ activeWeeks: 0, totalWeeks: 0, ratio: 0 });
    expect(getContributorWeeklyActivity({ "not-a-date": 3 })).toEqual({ activeWeeks: 0, totalWeeks: 0, ratio: 0 });
  });

  it("covers helper defaults and invalid bounds branches", () => {
    expect(formatWeekRangeLabel("", "2026-03-01")).toBe("");

    const invalidBounds = buildLineChangesByDaySeries(
      makeSnapshot({
        data: {
          timeSeries: {
            defaultBranch: {
              lineChangesByDay: {
                "zzz": { additions: 5, deletions: 2 },
                "aaa": { additions: 1, deletions: 1 },
              } as any,
            },
          },
        },
      }),
    );
    expect(invalidBounds).toEqual([]);

    const trimmedTail = buildCommitTimelineSeries(
      makeSnapshot({
        repoStats: [
          {
            totalCommits: 5,
            totalAdditions: 0,
            totalDeletions: 0,
            totalContributors: 1,
            matchedContributors: 1,
            unmatchedContributors: 0,
            unmatchedCommits: 0,
            commitsByDay: {
              "2026-03-01": 5,
              "2026-03-02": 0,
              "2026-03-03": 0,
            },
          },
        ],
      }),
      null,
    );
    expect(trimmedTail).toEqual([{ date: "2026-03-01", commits: 5, personalCommits: 0 }]);

    expect(getChartMinWidth(10)).toBe(720);
    expect(getDateTickInterval(30)).toBe(2);
  });
});
