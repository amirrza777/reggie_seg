import { describe, expect, it } from "vitest";
import {
  buildCommitTimelineSeries,
  buildLineChangesByDaySeries,
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
});
