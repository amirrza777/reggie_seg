import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubServiceError } from "./errors.js";

const repoMocks = vi.hoisted(() => ({
  createGithubSnapshot: vi.fn(),
  findGithubAccountByUserId: vi.fn(),
  findLatestGithubSnapshotByProjectLinkId: vi.fn(),
  findProjectGithubRepositoryLinkById: vi.fn(),
  isUserInProject: vi.fn(),
  listProjectGithubIdentityCandidates: vi.fn(),
}));

const oauthMocks = vi.hoisted(() => ({
  getValidGithubAccessToken: vi.fn(),
}));

const fetchMocks = vi.hoisted(() => ({
  contributorKeyFromCommit: vi.fn(),
  fetchCommitStatsForRepository: vi.fn(),
  fetchCommitsForLinkedRepository: vi.fn(),
  listRepositoryBranches: vi.fn(),
}));

const aggregateMocks = vi.hoisted(() => ({
  aggregateCommitData: vi.fn(),
  filterCommitsAfter: vi.fn(),
  hasUsableRepoCommitsByDay: vi.fn(),
  mergeCountMaps: vi.fn(),
  mergeLineChangeMaps: vi.fn(),
  mergeSampleCommits: vi.fn(),
  mergeUserStats: vi.fn(),
}));

vi.mock("./repo.js", () => repoMocks);
vi.mock("./oauth.service.js", () => ({
  getValidGithubAccessToken: oauthMocks.getValidGithubAccessToken,
}));
vi.mock("./service.analysis.fetch.js", () => fetchMocks);
vi.mock("./service.analysis.aggregate.js", () => aggregateMocks);
vi.mock("./analysis.helpers.js", () => ({
  aggregateLineChangesByDay: vi.fn(() => ({})),
}));

import { analyseProjectGithubRepository } from "./service.analysis.run.js";

describe("github service.analysis.run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 404 when link is missing", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue(null);
    await expect(analyseProjectGithubRepository(1, 99)).rejects.toEqual(
      new GithubServiceError(404, "Project GitHub repository link not found")
    );
  });

  it("throws 403 when user is not in project", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({
      id: 5,
      projectId: 2,
      repository: { id: 7, fullName: "org/repo", htmlUrl: "", ownerLogin: "org", defaultBranch: "main" },
    });
    repoMocks.isUserInProject.mockResolvedValue(false);
    await expect(analyseProjectGithubRepository(1, 5)).rejects.toEqual(
      new GithubServiceError(403, "You are not a member of this project")
    );
  });

  it("throws 404 when github account is not connected", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({
      id: 5,
      projectId: 2,
      linkedByUserId: 3,
      repository: { id: 7, fullName: "org/repo", htmlUrl: "", ownerLogin: "org", defaultBranch: "main" },
    });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.listProjectGithubIdentityCandidates.mockResolvedValue([]);
    repoMocks.findGithubAccountByUserId.mockResolvedValue(null);
    await expect(analyseProjectGithubRepository(1, 5)).rejects.toEqual(
      new GithubServiceError(404, "GitHub account is not connected")
    );
  });

  it("falls back to linked-by account when requester is not connected", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({
      id: 5,
      projectId: 2,
      linkedByUserId: 9,
      syncIntervalMinutes: 60,
      repository: {
        id: 7,
        fullName: "org/repo",
        htmlUrl: "https://github.com/org/repo",
        ownerLogin: "org",
        defaultBranch: "main",
      },
    });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.listProjectGithubIdentityCandidates.mockResolvedValue([]);
    repoMocks.findGithubAccountByUserId.mockImplementation(async (candidateUserId: number) =>
      candidateUserId === 9 ? { userId: 9 } : null
    );
    oauthMocks.getValidGithubAccessToken.mockResolvedValue("token");
    repoMocks.findLatestGithubSnapshotByProjectLinkId.mockResolvedValue(null);
    aggregateMocks.hasUsableRepoCommitsByDay.mockReturnValue(false);
    fetchMocks.fetchCommitsForLinkedRepository.mockResolvedValue([]);
    aggregateMocks.filterCommitsAfter.mockImplementation((x: any) => x);
    fetchMocks.listRepositoryBranches.mockResolvedValue([]);
    fetchMocks.fetchCommitStatsForRepository.mockResolvedValue(new Map());
    aggregateMocks.aggregateCommitData.mockReturnValue({
      contributors: [],
      repoCommitsByDay: {},
      repoCommitsByBranch: {},
    });
    aggregateMocks.mergeUserStats.mockImplementation((_prev: any, incoming: any) => incoming);
    aggregateMocks.mergeCountMaps.mockReturnValue({});
    aggregateMocks.mergeLineChangeMaps.mockReturnValue({});
    aggregateMocks.mergeSampleCommits.mockReturnValue([]);
    repoMocks.createGithubSnapshot.mockResolvedValue({ id: 202 });

    await expect(analyseProjectGithubRepository(1, 5)).resolves.toEqual({ id: 202 });
    expect(repoMocks.findGithubAccountByUserId).toHaveBeenCalledWith(1);
    expect(repoMocks.findGithubAccountByUserId).toHaveBeenCalledWith(9);
  });

  it("builds and persists snapshot on success path", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({
      id: 5,
      projectId: 2,
      syncIntervalMinutes: 60,
      repository: {
        id: 7,
        fullName: "org/repo",
        htmlUrl: "https://github.com/org/repo",
        ownerLogin: "org",
        defaultBranch: "main",
      },
    });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findGithubAccountByUserId.mockResolvedValue({ userId: 1 });
    oauthMocks.getValidGithubAccessToken.mockResolvedValue("token");
    repoMocks.findLatestGithubSnapshotByProjectLinkId.mockResolvedValue(null);
    aggregateMocks.hasUsableRepoCommitsByDay.mockReturnValue(false);
    fetchMocks.fetchCommitsForLinkedRepository.mockResolvedValue([]);
    aggregateMocks.filterCommitsAfter.mockImplementation((x: any) => x);
    fetchMocks.listRepositoryBranches.mockResolvedValue([]);
    fetchMocks.fetchCommitStatsForRepository.mockResolvedValue(new Map());
    aggregateMocks.aggregateCommitData.mockReturnValue({
      contributors: [],
      repoCommitsByDay: {},
      repoCommitsByBranch: {},
    });
    repoMocks.listProjectGithubIdentityCandidates.mockResolvedValue([]);
    aggregateMocks.mergeUserStats.mockImplementation((_prev: any, incoming: any) => incoming);
    aggregateMocks.mergeCountMaps.mockReturnValue({});
    aggregateMocks.mergeLineChangeMaps.mockReturnValue({});
    aggregateMocks.mergeSampleCommits.mockReturnValue([]);
    repoMocks.createGithubSnapshot.mockResolvedValue({ id: 101 });

    const result = await analyseProjectGithubRepository(1, 5);

    expect(repoMocks.createGithubSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        projectGithubRepositoryId: 5,
        analysedByUserId: 1,
        userStats: [],
        repoStat: expect.objectContaining({ totalCommits: 0, totalContributors: 0 }),
      })
    );
    expect(result).toEqual({ id: 101 });
  });

  it("rebuilds from analysed window start when previous commit-stat coverage is incomplete", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({
      id: 5,
      projectId: 2,
      syncIntervalMinutes: 60,
      repository: {
        id: 7,
        fullName: "org/repo",
        htmlUrl: "https://github.com/org/repo",
        ownerLogin: "org",
        defaultBranch: "main",
      },
    });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findGithubAccountByUserId.mockResolvedValue({ userId: 1 });
    oauthMocks.getValidGithubAccessToken.mockResolvedValue("token");
    repoMocks.listProjectGithubIdentityCandidates.mockResolvedValue([]);
    repoMocks.findLatestGithubSnapshotByProjectLinkId.mockResolvedValue({
      analysedAt: new Date("2026-03-20T12:00:00.000Z"),
      data: {
        analysedWindow: { since: "2026-01-20T00:00:00.000Z", until: "2026-03-20T12:00:00.000Z" },
        commitStatsCoverage: { detailedCommitCount: 250, requestedCommitCount: 900 },
      },
      userStats: [],
      repoStats: [{ commitsByDay: { "2026-03-20": 2 }, commitsByBranch: { main: 2 }, totalCommits: 2 }],
    });
    aggregateMocks.hasUsableRepoCommitsByDay.mockReturnValue(true);
    fetchMocks.fetchCommitsForLinkedRepository.mockResolvedValue([]);
    aggregateMocks.filterCommitsAfter.mockImplementation((x: any) => x);
    fetchMocks.listRepositoryBranches.mockResolvedValue([]);
    fetchMocks.fetchCommitStatsForRepository.mockResolvedValue(new Map());
    aggregateMocks.aggregateCommitData.mockReturnValue({
      contributors: [],
      repoCommitsByDay: {},
      repoCommitsByBranch: {},
    });
    aggregateMocks.mergeUserStats.mockImplementation((_prev: any, incoming: any) => incoming);
    aggregateMocks.mergeCountMaps.mockReturnValue({});
    aggregateMocks.mergeLineChangeMaps.mockReturnValue({});
    aggregateMocks.mergeSampleCommits.mockReturnValue([]);
    repoMocks.createGithubSnapshot.mockResolvedValue({ id: 303 });

    await analyseProjectGithubRepository(1, 5);

    expect(fetchMocks.fetchCommitsForLinkedRepository).toHaveBeenCalledWith(
      "token",
      "org/repo",
      "main",
      "2026-01-20T00:00:00.000Z"
    );
    expect(aggregateMocks.filterCommitsAfter).toHaveBeenCalledWith([], null);
    expect(aggregateMocks.mergeUserStats).not.toHaveBeenCalled();
    expect(repoMocks.createGithubSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          analysedWindow: expect.objectContaining({
            since: "2026-01-20T00:00:00.000Z",
          }),
        }),
      })
    );
  });
});
