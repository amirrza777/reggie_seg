import { describe, expect, it } from "vitest";
import {
  buildCommitTimelineSeries,
  buildLineChangesByDaySeries,
  buildWeeklyCommitSeries,
  formatWeekRangeLabel,
  getContributorWeeklyActivity,
  getSnapshotRepoTotals,
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

describe("GithubRepoChartsDashboard.helpers", () => {
  it("builds commit timeline bounds from real data days, not analysedAt", () => {
    const snapshot = makeSnapshot({
      repoStats: [
        {
          totalCommits: 3,
          totalAdditions: 0,
          totalDeletions: 0,
          totalContributors: 1,
          matchedContributors: 1,
          unmatchedContributors: 0,
          unmatchedCommits: 0,
          commitsByDay: {
            "2026-03-19": 1,
            "2026-03-20": 2,
          },
        },
      ],
    });

    expect(buildCommitTimelineSeries(snapshot, null)).toEqual([
      { date: "2026-03-19", commits: 1, personalCommits: 0 },
      { date: "2026-03-20", commits: 2, personalCommits: 0 },
    ]);
  });

  it("does not append trailing line-change buckets for analysedAt when no data exists on that day", () => {
    const snapshot = makeSnapshot({
      data: {
        timeSeries: {
          defaultBranch: {
            lineChangesByDay: {
              "2026-03-19": { additions: 12, deletions: 4 },
            },
          },
        },
      },
      repoStats: [
        {
          totalCommits: 1,
          totalAdditions: 12,
          totalDeletions: 4,
          totalContributors: 1,
          matchedContributors: 1,
          unmatchedContributors: 0,
          unmatchedCommits: 0,
          commitsByDay: {
            "2026-03-19": 1,
          },
        },
      ],
    });

    expect(buildLineChangesByDaySeries(snapshot)).toEqual([
      { date: "2026-03-19", additions: 12, deletions: -4 },
    ]);
  });

  it("does not stretch commit timeline to line-change-only dates", () => {
    const snapshot = makeSnapshot({
      data: {
        timeSeries: {
          defaultBranch: {
            lineChangesByDay: {
              "2026-03-19": { additions: 12, deletions: 4 },
              "2026-03-20": { additions: 8, deletions: 3 },
            },
          },
        },
      },
      repoStats: [
        {
          totalCommits: 3,
          totalAdditions: 20,
          totalDeletions: 7,
          totalContributors: 1,
          matchedContributors: 1,
          unmatchedContributors: 0,
          unmatchedCommits: 0,
          commitsByDay: {
            "2026-03-15": 1,
            "2026-03-16": 2,
          },
        },
      ],
    });

    expect(buildCommitTimelineSeries(snapshot, null)).toEqual([
      { date: "2026-03-15", commits: 1, personalCommits: 0 },
      { date: "2026-03-16", commits: 2, personalCommits: 0 },
    ]);
  });

  it("formats weekly labels as readable date ranges", () => {
    expect(formatWeekRangeLabel("2026-03-02", "2026-03-08")).toBe("Mar 2-8");
    expect(formatWeekRangeLabel("2026-03-30", "2026-04-05")).toBe("Mar 30 - Apr 5");
  });

  it("keeps zero-commit weeks when daily data spans that week", () => {
    const series = buildWeeklyCommitSeries([
      { date: "2026-03-02", commits: 3 },
      { date: "2026-03-03", commits: 1 },
      { date: "2026-03-04", commits: 0 },
      { date: "2026-03-05", commits: 0 },
      { date: "2026-03-06", commits: 0 },
      { date: "2026-03-07", commits: 0 },
      { date: "2026-03-08", commits: 0 },
      { date: "2026-03-09", commits: 0 },
      { date: "2026-03-10", commits: 0 },
      { date: "2026-03-11", commits: 0 },
      { date: "2026-03-12", commits: 0 },
      { date: "2026-03-13", commits: 0 },
      { date: "2026-03-14", commits: 0 },
      { date: "2026-03-15", commits: 0 },
    ]);

    expect(series).toEqual([
      {
        weekKey: "2026-W10",
        weekLabel: "Mar 2-8",
        rangeStart: "2026-03-02",
        rangeEnd: "2026-03-08",
        commits: 4,
      },
      {
        weekKey: "2026-W11",
        weekLabel: "Mar 9-15",
        rangeStart: "2026-03-09",
        rangeEnd: "2026-03-15",
        commits: 0,
      },
    ]);
  });

  it("counts active contributor weeks against the full observed week span", () => {
    expect(
      getContributorWeeklyActivity({
        "2026-02-02": 2,
        "2026-02-16": 3,
      })
    ).toEqual({
      activeWeeks: 2,
      totalWeeks: 3,
      ratio: 2 / 3,
    });
  });

  it("derives totals defensively when repoStats and fallback fields differ", () => {
    const snapshot = makeSnapshot({
      data: {
        branchScopeStats: {
          defaultBranch: {
            branch: "main",
            totalCommits: 8,
            totalAdditions: 120,
            totalDeletions: 50,
          },
        },
      },
      userStats: [
        {
          id: 10,
          mappedUserId: 1,
          githubLogin: "a",
          isMatched: true,
          commits: 5,
          additions: 30,
          deletions: 10,
          commitsByDay: { "2026-03-02": 5 },
        },
        {
          id: 11,
          mappedUserId: null,
          githubLogin: "b",
          isMatched: false,
          commits: 3,
          additions: 90,
          deletions: 40,
          commitsByDay: { "2026-03-03": 3 },
        },
      ],
      repoStats: [
        {
          totalCommits: 7,
          totalAdditions: 100,
          totalDeletions: 45,
          totalContributors: 1,
          matchedContributors: 1,
          unmatchedContributors: 0,
          unmatchedCommits: 0,
          commitsByDay: {
            "2026-03-02": 5,
            "2026-03-03": 3,
          },
        },
      ],
    });

    expect(getSnapshotRepoTotals(snapshot)).toEqual({
      totalCommits: 8,
      totalAdditions: 120,
      totalDeletions: 50,
      totalContributors: 2,
    });
  });
});
