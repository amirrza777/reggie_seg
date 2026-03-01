import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubProjectReposClient } from "./GithubProjectReposClient";
import * as githubClient from "../api/client";

vi.mock("./GithubProjectReposHero", () => ({
  GithubProjectReposHero: () => <div data-testid="github-hero">hero</div>,
}));

vi.mock("./GithubRepoLinkCard", () => ({
  GithubRepoLinkCard: ({ link }: { link: { repository: { fullName: string } } }) => (
    <div data-testid="github-link-card">{link.repository.fullName}</div>
  ),
}));

vi.mock("../api/client", () => ({
  getGithubConnectionStatus: vi.fn(),
  getGithubConnectUrl: vi.fn(),
  disconnectGithubAccount: vi.fn(),
  listGithubRepositories: vi.fn(),
  listProjectGithubRepoLinks: vi.fn(),
  linkGithubRepositoryToProject: vi.fn(),
  removeProjectGithubRepoLink: vi.fn(),
  getLatestProjectGithubSnapshot: vi.fn(),
  analyseProjectGithubRepo: vi.fn(),
  getProjectGithubMappingCoverage: vi.fn(),
  listLiveProjectGithubRepoBranches: vi.fn(),
  listLiveProjectGithubRepoBranchCommits: vi.fn(),
  listLiveProjectGithubRepoMyCommits: vi.fn(),
}));

function makeConnectionStatus() {
  return {
    connected: true,
    account: {
      userId: 1,
      login: "adxmir",
      email: "adxmir@example.com",
      scopes: null,
      tokenType: "bearer",
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      tokenLastRefreshedAt: null,
      createdAt: "2026-02-26T10:00:00.000Z",
      updatedAt: "2026-02-26T10:00:00.000Z",
    },
  };
}

function makeLink() {
  return {
    id: 101,
    projectId: 1,
    githubRepositoryId: 55,
    linkedByUserId: 1,
    isActive: true,
    autoSyncEnabled: false,
    syncIntervalMinutes: 60,
    lastSyncedAt: null,
    nextSyncAt: null,
    createdAt: "2026-02-26T10:00:00.000Z",
    updatedAt: "2026-02-26T10:00:00.000Z",
    repository: {
      id: 55,
      githubRepoId: 999,
      ownerLogin: "adxmir",
      name: "demo-repo",
      fullName: "adxmir/demo-repo",
      htmlUrl: "https://github.com/adxmir/demo-repo",
      isPrivate: false,
      defaultBranch: "main",
      pushedAt: null,
      updatedAt: "2026-02-26T10:00:00.000Z",
    },
  };
}

describe("GithubProjectReposClient", () => {
  const getGithubConnectionStatusMock = vi.mocked(githubClient.getGithubConnectionStatus);
  const listProjectGithubRepoLinksMock = vi.mocked(githubClient.listProjectGithubRepoLinks);
  const listGithubRepositoriesMock = vi.mocked(githubClient.listGithubRepositories);
  const getProjectGithubMappingCoverageMock = vi.mocked(githubClient.getProjectGithubMappingCoverage);
  const getLatestProjectGithubSnapshotMock = vi.mocked(githubClient.getLatestProjectGithubSnapshot);
  const analyseProjectGithubRepoMock = vi.mocked(githubClient.analyseProjectGithubRepo);
  const listLiveProjectGithubRepoMyCommitsMock = vi.mocked(githubClient.listLiveProjectGithubRepoMyCommits);
  const listLiveProjectGithubRepoBranchesMock = vi.mocked(githubClient.listLiveProjectGithubRepoBranches);
  const listLiveProjectGithubRepoBranchCommitsMock = vi.mocked(githubClient.listLiveProjectGithubRepoBranchCommits);

  beforeEach(() => {
    vi.clearAllMocks();

    getGithubConnectionStatusMock.mockResolvedValue(makeConnectionStatus() as never);
    listProjectGithubRepoLinksMock.mockResolvedValue([makeLink()] as never);
    listGithubRepositoriesMock.mockResolvedValue([] as never);
    getProjectGithubMappingCoverageMock.mockResolvedValue({
      linkId: 101,
      snapshotId: 1,
      analysedAt: "2026-02-26T10:00:00.000Z",
      coverage: {
        totalContributors: 1,
        matchedContributors: 1,
        unmatchedContributors: 0,
        totalCommits: 2,
        unmatchedCommits: 0,
      },
    } as never);
    getLatestProjectGithubSnapshotMock.mockResolvedValue({
      snapshot: null,
    } as never);
    analyseProjectGithubRepoMock.mockResolvedValue({
      snapshot: { id: 1, analysedAt: "2026-02-26T10:00:00.000Z" },
    } as never);

    listLiveProjectGithubRepoMyCommitsMock.mockResolvedValue({
      linkId: 101,
      repository: {
        id: 55,
        fullName: "adxmir/demo-repo",
        defaultBranch: "main",
        htmlUrl: "https://github.com/adxmir/demo-repo",
      },
      githubLogin: "adxmir",
      page: 1,
      perPage: 10,
      hasNextPage: false,
      totals: null,
      commits: [],
    } as never);
    listLiveProjectGithubRepoBranchesMock.mockResolvedValue({
      linkId: 101,
      repository: {
        id: 55,
        fullName: "adxmir/demo-repo",
        defaultBranch: "main",
        htmlUrl: "https://github.com/adxmir/demo-repo",
      },
      branches: [],
    } as never);
    listLiveProjectGithubRepoBranchCommitsMock.mockResolvedValue({
      linkId: 101,
      repository: {
        id: 55,
        fullName: "adxmir/demo-repo",
        defaultBranch: "main",
        htmlUrl: "https://github.com/adxmir/demo-repo",
      },
      branch: "main",
      commits: [],
    } as never);
  });

  it("refreshes snapshots by analysing linked repos and reloading data", async () => {
    render(<GithubProjectReposClient projectId="1" />);

    await screen.findByText("Linked repositories");
    expect(await screen.findByTestId("github-link-card")).toHaveTextContent("adxmir/demo-repo");

    const refreshButton = screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(analyseProjectGithubRepoMock).toHaveBeenCalledWith(101);
    });

    await waitFor(() => {
      expect(listProjectGithubRepoLinksMock).toHaveBeenCalledTimes(2);
      expect(getGithubConnectionStatusMock).toHaveBeenCalledTimes(2);
      expect(getLatestProjectGithubSnapshotMock).toHaveBeenCalledTimes(2);
      expect(getProjectGithubMappingCoverageMock).toHaveBeenCalledTimes(2);
    });
  });
});
