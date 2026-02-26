import { describe, expect, it, vi } from "vitest";

vi.mock("./repo.js", () => ({
  findLatestGithubSnapshotByProjectLinkId: vi.fn(),
}));

vi.mock("./service.analysis.fetch.js", () => ({
  contributorKeyFromCommit: (commit: any) => {
    const login = commit.author?.login?.toLowerCase?.();
    if (login) return `login:${login}`;
    const email = commit.commit?.author?.email?.toLowerCase?.();
    if (email) return `email:${email}`;
    return "unmatched:unknown";
  },
  toUtcDayKey: (date: Date) => date.toISOString().slice(0, 10),
}));

import {
  aggregateCommitData,
  filterCommitsAfter,
  hasUsableRepoCommitsByDay,
  isMergePullRequestCommit,
  mergeCountMaps,
  mergeLineChangeMaps,
  mergeSampleCommits,
  mergeUserStats,
  type SnapshotUserStatRecord,
  type SnapshotUserStatRow,
} from "./service.analysis.aggregate.js";

function makeCommit({
  sha,
  date,
  login,
  email,
  message = "feat: test",
  authorId,
}: {
  sha: string;
  date: string | null;
  login?: string | null;
  email?: string | null;
  message?: string;
  authorId?: number;
}) {
  return {
    sha,
    commit: {
      message,
      author: date ? { date, email: email ?? null, name: "Test" } : null,
    },
    author: login ? { id: authorId, login } : null,
  } as any;
}

describe("service.analysis.aggregate helpers", () => {
  it("detects merge pull request commits by message prefix", () => {
    expect(isMergePullRequestCommit(makeCommit({ sha: "1", date: "2026-02-26T00:00:00Z", message: "Merge pull request #1 from x" }))).toBe(true);
    expect(isMergePullRequestCommit(makeCommit({ sha: "2", date: "2026-02-26T00:00:00Z", message: "feat: regular" }))).toBe(false);
  });

  it("aggregates commits by contributor/day/branch for the default branch", () => {
    const commits = [
      makeCommit({ sha: "a", date: "2026-02-26T01:00:00Z", login: "Alice", email: "a@x.com", authorId: 1 }),
      makeCommit({ sha: "b", date: "2026-02-26T05:00:00Z", login: "Alice", email: "a@x.com", authorId: 1 }),
      makeCommit({ sha: "c", date: "2026-02-27T00:00:00Z", email: "b@x.com" }),
      makeCommit({ sha: "bad", date: null }),
    ];

    const result = aggregateCommitData(commits as any, "main");

    expect(result.repoCommitsByDay).toEqual({
      "2026-02-26": 2,
      "2026-02-27": 1,
    });
    expect(result.repoCommitsByBranch).toEqual({ main: 3 });
    expect(result.contributors).toHaveLength(2);
    expect(result.contributors.find((c) => c.contributorKey === "login:alice")?.commits).toBe(2);
  });

  it("merges count maps and line change maps", () => {
    expect(mergeCountMaps({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 5, c: 4 });
    expect(
      mergeLineChangeMaps(
        { "2026-02-26": { additions: 5, deletions: 1 } },
        { "2026-02-26": { additions: 2, deletions: 3 }, "2026-02-27": { additions: 1, deletions: 0 } }
      )
    ).toEqual({
      "2026-02-26": { additions: 7, deletions: 4 },
      "2026-02-27": { additions: 1, deletions: 0 },
    });
  });

  it("merges user stats and keeps earliest/latest commit dates", () => {
    const previous: SnapshotUserStatRow[] = [
      {
        mappedUserId: 1,
        contributorKey: "login:alice",
        githubUserId: BigInt(1),
        githubLogin: "alice",
        authorEmail: "a@x.com",
        isMatched: true,
        commits: 2,
        additions: 10,
        deletions: 4,
        commitsByDay: { "2026-02-26": 2 },
        commitsByBranch: { main: 2 },
        firstCommitAt: new Date("2026-02-26T00:00:00Z"),
        lastCommitAt: new Date("2026-02-26T02:00:00Z"),
      },
    ];
    const incoming: SnapshotUserStatRecord[] = [
      {
        mappedUserId: 1,
        contributorKey: "login:alice",
        githubUserId: BigInt(1),
        githubLogin: "alice",
        authorEmail: "a@x.com",
        isMatched: true,
        commits: 1,
        additions: 3,
        deletions: 1,
        commitsByDay: { "2026-02-27": 1 },
        commitsByBranch: { main: 1 },
        firstCommitAt: new Date("2026-02-25T23:00:00Z"),
        lastCommitAt: new Date("2026-02-27T01:00:00Z"),
      },
    ];

    const [merged] = mergeUserStats(previous, incoming);
    expect(merged.commits).toBe(3);
    expect(merged.additions).toBe(13);
    expect(merged.deletions).toBe(5);
    expect(merged.commitsByDay).toEqual({ "2026-02-26": 2, "2026-02-27": 1 });
    expect(merged.firstCommitAt?.toISOString()).toBe("2026-02-25T23:00:00.000Z");
    expect(merged.lastCommitAt?.toISOString()).toBe("2026-02-27T01:00:00.000Z");
  });

  it("merges sample commits uniquely and caps to 200", () => {
    const previous = [{ sha: "b", date: null, login: null, email: null }];
    const merged = mergeSampleCommits(previous as any, [
      makeCommit({ sha: "a", date: "2026-02-26T00:00:00Z" }),
      makeCommit({ sha: "b", date: "2026-02-26T01:00:00Z" }),
    ] as any);

    expect(merged.map((x) => x.sha)).toEqual(["a", "b"]);
  });

  it("filters commits strictly after cutoff and checks repo commits-by-day usability", () => {
    const commits = [
      makeCommit({ sha: "a", date: "2026-02-26T00:00:00Z" }),
      makeCommit({ sha: "b", date: "2026-02-27T00:00:00Z" }),
      makeCommit({ sha: "bad", date: "not-a-date" }),
    ];
    const filtered = filterCommitsAfter(commits as any, new Date("2026-02-26T12:00:00Z"));
    expect(filtered.map((c: any) => c.sha)).toEqual(["b"]);

    expect(hasUsableRepoCommitsByDay(null as any)).toBe(false);
    expect(hasUsableRepoCommitsByDay({ repoStats: [{ totalCommits: 0, commitsByDay: null }] } as any)).toBe(true);
    expect(hasUsableRepoCommitsByDay({ repoStats: [{ totalCommits: 2, commitsByDay: {} }] } as any)).toBe(false);
    expect(hasUsableRepoCommitsByDay({ repoStats: [{ totalCommits: 2, commitsByDay: { "2026-02-26": 2 } }] } as any)).toBe(true);
  });
});

