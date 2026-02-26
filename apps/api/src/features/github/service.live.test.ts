import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  deactivateProjectGithubRepositoryLink: vi.fn(),
  findGithubAccountByUserId: vi.fn(),
  findProjectGithubRepositoryLinkById: vi.fn(),
  isUserInProject: vi.fn(),
}));

const oauthMocks = vi.hoisted(() => ({
  getValidGithubAccessToken: vi.fn(),
}));

const fetchMocks = vi.hoisted(() => ({
  fetchAllUserCommitsForRepository: vi.fn(),
  fetchCommitStatsForRepository: vi.fn(),
  fetchRecentCommitsForBranch: vi.fn(),
  fetchUserCommitsForRepositoryPage: vi.fn(),
  getBranchAheadBehind: vi.fn(),
  listRepositoryBranchesLive: vi.fn(),
}));

const aggregateMocks = vi.hoisted(() => ({
  isMergePullRequestCommit: vi.fn(),
}));

vi.mock("./repo.js", () => repoMocks);
vi.mock("./oauth.service.js", () => ({ getValidGithubAccessToken: oauthMocks.getValidGithubAccessToken }));
vi.mock("./service.analysis.fetch.js", () => fetchMocks);
vi.mock("./service.analysis.aggregate.js", () => ({ isMergePullRequestCommit: aggregateMocks.isMergePullRequestCommit }));

import {
  listLiveProjectGithubRepositoryBranchCommits,
  listLiveProjectGithubRepositoryBranches,
  listLiveProjectGithubRepositoryMyCommits,
  removeProjectGithubRepositoryLink,
} from "./service.live.js";

describe("service.live", () => {
  const link = {
    id: 4,
    projectId: 15,
    repository: {
      id: 21,
      fullName: "org/repo",
      defaultBranch: "main",
      htmlUrl: "https://github.com/org/repo",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue(link);
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findGithubAccountByUserId.mockResolvedValue({ login: "alice" });
    oauthMocks.getValidGithubAccessToken.mockResolvedValue("token");
    aggregateMocks.isMergePullRequestCommit.mockReturnValue(false);
  });

  it("lists branches, compares to default branch, and sorts default first", async () => {
    fetchMocks.listRepositoryBranchesLive.mockResolvedValue([
      { name: "feature-b", protected: false, headSha: "sha-b" },
      { name: "main", protected: true, headSha: "sha-main" },
      { name: "feature-a", protected: false, headSha: "sha-a" },
    ]);
    fetchMocks.getBranchAheadBehind
      .mockResolvedValueOnce({ aheadBy: 2, behindBy: 0, status: "ahead" })
      .mockResolvedValueOnce({ aheadBy: 0, behindBy: 0, status: "identical" })
      .mockResolvedValueOnce({ aheadBy: 0, behindBy: 3, status: "behind" });

    const result = await listLiveProjectGithubRepositoryBranches(7, 4);

    expect(result.branches.map((branch) => branch.name)).toEqual(["main", "feature-a", "feature-b"]);
    expect(result.branches[0]).toMatchObject({ isDefault: true, compareStatus: "identical" });
    expect(fetchMocks.getBranchAheadBehind).toHaveBeenCalledWith("token", "org/repo", "main", "feature-b");
  });

  it("returns branch commits with stats and clamps the requested limit", async () => {
    fetchMocks.fetchRecentCommitsForBranch.mockResolvedValue([
      {
        sha: "abc",
        commit: {
          message: "Add feature",
          author: { date: "2026-02-26T12:00:00Z", email: "alice@example.com" },
        },
        author: { login: "alice" },
      },
    ]);
    fetchMocks.fetchCommitStatsForRepository.mockResolvedValue(new Map([["abc", { additions: 12, deletions: 3 }]]));

    const result = await listLiveProjectGithubRepositoryBranchCommits(7, 4, "feature-a", 999);

    expect(fetchMocks.fetchRecentCommitsForBranch).toHaveBeenCalledWith("token", "org/repo", "feature-a", 10);
    expect(result.branch).toBe("feature-a");
    expect(result.commits).toEqual([
      expect.objectContaining({
        sha: "abc",
        additions: 12,
        deletions: 3,
        htmlUrl: "https://github.com/org/repo/commit/abc",
      }),
    ]);
  });

  it("returns paged my commits and totals with merge/non-merge split", async () => {
    const pageCommitA = {
      sha: "c1",
      commit: { message: "Merge PR #1", author: { date: "2026-02-20T10:00:00Z", email: "a@x.com" } },
      author: { login: "alice" },
    };
    const pageCommitB = {
      sha: "c2",
      commit: { message: "Feature", author: { date: "2026-02-21T10:00:00Z", email: "a@x.com" } },
      author: { login: "alice" },
    };

    fetchMocks.fetchUserCommitsForRepositoryPage.mockResolvedValue([pageCommitA, pageCommitB]);
    fetchMocks.fetchAllUserCommitsForRepository.mockResolvedValue([pageCommitA, pageCommitB]);
    fetchMocks.fetchCommitStatsForRepository
      .mockResolvedValueOnce(new Map([
        ["c1", { additions: 5, deletions: 1 }],
        ["c2", { additions: 8, deletions: 2 }],
      ]))
      .mockResolvedValueOnce(new Map([
        ["c1", { additions: 5, deletions: 1 }],
        ["c2", { additions: 8, deletions: 2 }],
      ]));
    aggregateMocks.isMergePullRequestCommit.mockImplementation((commit) => commit.sha === "c1");

    const result = await listLiveProjectGithubRepositoryMyCommits(7, 4, 0, 99);

    expect(fetchMocks.fetchUserCommitsForRepositoryPage).toHaveBeenCalledWith("token", "org/repo", "alice", 1, 20);
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
    expect(result.hasNextPage).toBe(false);
    expect(result.totals).toEqual({
      commits: 2,
      mergePullRequestCommits: 1,
      additionsExcludingMergePullRequests: 8,
      deletionsExcludingMergePullRequests: 2,
      additionsIncludingMergePullRequests: 13,
      deletionsIncludingMergePullRequests: 3,
      detailedCommitCount: 2,
      requestedCommitCount: 2,
    });
    expect(result.commits[0]).toMatchObject({ sha: "c1", isMergePullRequest: true });
    expect(result.commits[1]).toMatchObject({ sha: "c2", isMergePullRequest: false });
  });

  it("skips totals fetch when includeTotals is false and can remove a linked repo", async () => {
    fetchMocks.fetchUserCommitsForRepositoryPage.mockResolvedValue([]);
    fetchMocks.fetchCommitStatsForRepository.mockResolvedValue(new Map());

    const result = await listLiveProjectGithubRepositoryMyCommits(7, 4, 1, 10, { includeTotals: false });
    expect(result.totals).toBeNull();
    expect(fetchMocks.fetchAllUserCommitsForRepository).not.toHaveBeenCalled();

    repoMocks.deactivateProjectGithubRepositoryLink.mockResolvedValue({ id: 4, isActive: false });
    await expect(removeProjectGithubRepositoryLink(7, 4)).resolves.toEqual({ id: 4, isActive: false });
    expect(repoMocks.deactivateProjectGithubRepositoryLink).toHaveBeenCalledWith(4);
  });
});
