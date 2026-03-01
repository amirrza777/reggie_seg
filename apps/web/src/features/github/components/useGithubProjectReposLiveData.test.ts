import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listLiveProjectGithubRepoBranchCommits,
  listLiveProjectGithubRepoBranches,
  listLiveProjectGithubRepoMyCommits,
} from "../api/client";
import { useGithubProjectReposLiveData } from "./useGithubProjectReposLiveData";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  ProjectGithubRepoLink,
} from "../types";

vi.mock("../api/client", () => ({
  listLiveProjectGithubRepoBranchCommits: vi.fn(),
  listLiveProjectGithubRepoBranches: vi.fn(),
  listLiveProjectGithubRepoMyCommits: vi.fn(),
}));

const mockedListBranches = vi.mocked(listLiveProjectGithubRepoBranches);
const mockedListBranchCommits = vi.mocked(listLiveProjectGithubRepoBranchCommits);
const mockedListMyCommits = vi.mocked(listLiveProjectGithubRepoMyCommits);

function makeLink(id: number): ProjectGithubRepoLink {
  return {
    id,
    projectId: 1,
    githubRepositoryId: 10,
    linkedByUserId: 2,
    isActive: true,
    autoSyncEnabled: true,
    syncIntervalMinutes: 60,
    lastSyncedAt: null,
    nextSyncAt: null,
    createdAt: "2026-02-26T00:00:00.000Z",
    updatedAt: "2026-02-26T00:00:00.000Z",
    repository: {
      id: 10,
      githubRepoId: 999,
      ownerLogin: "team",
      name: "repo",
      fullName: "team/repo",
      htmlUrl: "https://github.com/team/repo",
      isPrivate: false,
      defaultBranch: "main",
      pushedAt: null,
      updatedAt: "2026-02-26T00:00:00.000Z",
    },
  };
}

function makeConnection(connected = true): GithubConnectionStatus {
  return {
    connected,
    account: connected
      ? {
          userId: 2,
          login: "alice",
          email: "alice@example.com",
          scopes: null,
          tokenType: "bearer",
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          tokenLastRefreshedAt: null,
          createdAt: "2026-02-26T00:00:00.000Z",
          updatedAt: "2026-02-26T00:00:00.000Z",
        }
      : null,
  };
}

function makeLatestSnapshotMap(linkId: number): Record<number, GithubLatestSnapshot["snapshot"] | null> {
  return {
    [linkId]: {
      id: 1,
      analysedAt: "2026-02-26T00:00:00.000Z",
      data: {
        branchScopeStats: {
          allBranches: {
            branchCount: 2,
            totalCommits: 10,
            totalAdditions: 20,
            totalDeletions: 5,
            commitsByBranch: { main: 8, "feature/login": 2 },
            commitStatsCoverage: { detailedCommitCount: 10, requestedCommitCount: 10 },
          },
        },
      },
      userStats: [],
      repoStats: [],
    },
  };
}

describe("useGithubProjectReposLiveData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("loads live branches for the branches tab, selects a default branch, and fetches branch commits", async () => {
    const link = makeLink(101);
    mockedListBranches.mockResolvedValue({
      linkId: 101,
      repository: {
        id: 10,
        fullName: "team/repo",
        defaultBranch: "main",
        htmlUrl: "https://github.com/team/repo",
      },
      branches: [
        {
          name: "main",
          isDefault: true,
          isProtected: true,
          headSha: "abc",
          aheadBy: 0,
          behindBy: 0,
          compareStatus: "identical",
        },
        {
          name: "feature/login",
          isDefault: false,
          isProtected: false,
          headSha: "def",
          aheadBy: 2,
          behindBy: 0,
          compareStatus: "ahead",
        },
      ],
    });
    mockedListBranchCommits.mockResolvedValue({
      linkId: 101,
      repository: {
        id: 10,
        fullName: "team/repo",
        defaultBranch: "main",
        htmlUrl: "https://github.com/team/repo",
      },
      branch: "main",
      commits: [],
    });

    const { result } = renderHook(() =>
      useGithubProjectReposLiveData({
        activeTab: "branches",
        loading: false,
        links: [link],
        connection: makeConnection(true),
        latestSnapshotByLinkId: makeLatestSnapshotMap(101),
      })
    );

    await waitFor(() => {
      expect(mockedListBranches).toHaveBeenCalledWith(101);
    });
    await waitFor(() => {
      expect(result.current.selectedBranchByLinkId[101]).toBe("main");
    });
    await waitFor(() => {
      expect(mockedListBranchCommits).toHaveBeenCalledWith(101, "main", 10);
    });

    expect(result.current.buildBranchRows(link)).toEqual([
      ["main", "Yes", 8, 0, 0, "identical"],
      ["feature/login", "No", 2, 2, 0, "ahead"],
    ]);
  });

  it("fetchMyCommits preserves previous totals when a later page response omits totals", async () => {
    const link = makeLink(202);
    mockedListMyCommits
      .mockResolvedValueOnce({
        linkId: 202,
        repository: {
          id: 10,
          fullName: "team/repo",
          defaultBranch: "main",
          htmlUrl: "https://github.com/team/repo",
        },
        githubLogin: "alice",
        page: 1,
        perPage: 10,
        hasNextPage: true,
        totals: {
          commits: 12,
          mergePullRequestCommits: 1,
          additionsExcludingMergePullRequests: 40,
          deletionsExcludingMergePullRequests: 10,
          additionsIncludingMergePullRequests: 45,
          deletionsIncludingMergePullRequests: 12,
          detailedCommitCount: 12,
          requestedCommitCount: 12,
        },
        commits: [],
      })
      .mockResolvedValueOnce({
        linkId: 202,
        repository: {
          id: 10,
          fullName: "team/repo",
          defaultBranch: "main",
          htmlUrl: "https://github.com/team/repo",
        },
        githubLogin: "alice",
        page: 2,
        perPage: 10,
        hasNextPage: false,
        totals: null,
        commits: [],
      });

    const { result } = renderHook(() =>
      useGithubProjectReposLiveData({
        activeTab: "repositories",
        loading: false,
        links: [link],
        connection: makeConnection(true),
        latestSnapshotByLinkId: {},
      })
    );

    await act(async () => {
      await result.current.fetchMyCommits(202, 1, { includeTotals: true });
    });
    expect(mockedListMyCommits).toHaveBeenNthCalledWith(1, 202, 1, 10, { includeTotals: true });
    expect(result.current.myCommitsByLinkId[202]?.totals?.commits).toBe(12);

    await act(async () => {
      await result.current.fetchMyCommits(202, 2, { includeTotals: false });
    });
    expect(mockedListMyCommits).toHaveBeenNthCalledWith(2, 202, 2, 10, { includeTotals: false });
    expect(result.current.myCommitsByLinkId[202]?.page).toBe(2);
    expect(result.current.myCommitsByLinkId[202]?.totals?.commits).toBe(12);
  });

  it("prefetches my commits in the background when leaving the my-commits tab", async () => {
    vi.useFakeTimers();
    const link = makeLink(303);
    mockedListMyCommits.mockResolvedValue({
      linkId: 303,
      repository: {
        id: 10,
        fullName: "team/repo",
        defaultBranch: "main",
        htmlUrl: "https://github.com/team/repo",
      },
      githubLogin: "alice",
      page: 1,
      perPage: 10,
      hasNextPage: false,
      totals: null,
      commits: [],
    });

    renderHook(() =>
      useGithubProjectReposLiveData({
        activeTab: "repositories",
        loading: false,
        links: [link],
        connection: makeConnection(true),
        latestSnapshotByLinkId: {},
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedListMyCommits).toHaveBeenCalledWith(303, 1, 10, { includeTotals: false });
  });
});
