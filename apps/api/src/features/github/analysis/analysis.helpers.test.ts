import { describe, expect, it } from "vitest";
import { aggregateLineChangesByDay, type GithubCommitForAggregation } from "./analysis.helpers.js";

function makeCommit(sha: string, date: string | null): GithubCommitForAggregation {
  return {
    sha,
    commit: {
      author: date ? { date } : null,
    },
  };
}

describe("aggregateLineChangesByDay", () => {
  it("groups and sums additions/deletions by UTC day", () => {
    const commits: GithubCommitForAggregation[] = [
      makeCommit("a1", "2026-02-20T23:15:00Z"),
      makeCommit("a2", "2026-02-20T23:59:59Z"),
      makeCommit("b1", "2026-02-21T00:01:00Z"),
    ];
    const stats = new Map<string, { additions: number; deletions: number }>([
      ["a1", { additions: 10, deletions: 2 }],
      ["a2", { additions: 5, deletions: 3 }],
      ["b1", { additions: 7, deletions: 1 }],
    ]);

    expect(aggregateLineChangesByDay(commits, stats)).toEqual({
      "2026-02-20": { additions: 15, deletions: 5 },
      "2026-02-21": { additions: 7, deletions: 1 },
    });
  });

  it("skips commits with invalid dates, missing authors, or missing detailed stats", () => {
    const commits: GithubCommitForAggregation[] = [
      makeCommit("ok", "2026-02-21T12:00:00Z"),
      makeCommit("missing-stats", "2026-02-21T12:30:00Z"),
      makeCommit("bad-date", "not-a-date"),
      makeCommit("no-author", null),
    ];
    const stats = new Map<string, { additions: number; deletions: number }>([
      ["ok", { additions: 4, deletions: 1 }],
    ]);

    expect(aggregateLineChangesByDay(commits, stats)).toEqual({
      "2026-02-21": { additions: 4, deletions: 1 },
    });
  });

  it("handles zero-valued stats without dropping the day bucket", () => {
    const commits: GithubCommitForAggregation[] = [makeCommit("zero", "2026-02-22T08:00:00Z")];
    const stats = new Map<string, { additions: number; deletions: number }>([
      ["zero", { additions: 0, deletions: 0 }],
    ]);

    expect(aggregateLineChangesByDay(commits, stats)).toEqual({
      "2026-02-22": { additions: 0, deletions: 0 },
    });
  });
});
