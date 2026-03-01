import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  analyseProjectGithubRepo,
  disconnectGithubAccount,
  getGithubConnectUrl,
  getGithubConnectionStatus,
  getLatestProjectGithubSnapshot,
  getProjectGithubMappingCoverage,
  linkGithubRepositoryToProject,
  listGithubRepositories,
  listLiveProjectGithubRepoBranchCommits,
  listLiveProjectGithubRepoBranches,
  listLiveProjectGithubRepoMyCommits,
  listProjectGithubRepoLinks,
  removeProjectGithubRepoLink,
} from "./client";

describe("github api client wrappers", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("uses the expected endpoints for read operations", async () => {
    apiFetchMock.mockResolvedValueOnce({ connected: true });
    apiFetchMock.mockResolvedValueOnce({ url: "https://github.com/login/oauth/authorize" });
    apiFetchMock.mockResolvedValueOnce({ repos: [{ id: 1 }] });
    apiFetchMock.mockResolvedValueOnce({ links: [{ id: 2 }] });
    apiFetchMock.mockResolvedValueOnce({ snapshot: { id: 3 } });
    apiFetchMock.mockResolvedValueOnce({ mappingCoverage: { linkId: 2 } });
    apiFetchMock.mockResolvedValueOnce({ linkId: 2, branches: [] });
    apiFetchMock.mockResolvedValueOnce({ linkId: 2, branch: "main", commits: [] });
    apiFetchMock.mockResolvedValueOnce({ linkId: 2, page: 1, perPage: 10, hasNextPage: false, totals: null, commits: [] });

    await getGithubConnectionStatus();
    await getGithubConnectUrl("http://127.0.0.1:3001/projects/1/repos");
    await listGithubRepositories();
    await listProjectGithubRepoLinks(1);
    await getLatestProjectGithubSnapshot(2);
    await getProjectGithubMappingCoverage(2);
    await listLiveProjectGithubRepoBranches(2);
    await listLiveProjectGithubRepoBranchCommits(2, "main", 5);
    await listLiveProjectGithubRepoMyCommits(2, 1, 10, { includeTotals: false });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/github/me");
    expect(apiFetchMock.mock.calls[1][0]).toContain("/github/connect?returnTo=");
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/github/repos");
    expect(apiFetchMock).toHaveBeenNthCalledWith(4, "/github/project-repos?projectId=1");
    expect(apiFetchMock).toHaveBeenNthCalledWith(5, "/github/project-repos/2/latest-snapshot");
    expect(apiFetchMock).toHaveBeenNthCalledWith(6, "/github/project-repos/2/mapping-coverage");
    expect(apiFetchMock).toHaveBeenNthCalledWith(7, "/github/project-repos/2/branches");
    expect(apiFetchMock.mock.calls[7][0]).toContain("/github/project-repos/2/branch-commits?");
    expect(apiFetchMock.mock.calls[8][0]).toContain("/github/project-repos/2/my-commits?");
    expect(apiFetchMock.mock.calls[8][0]).toContain("includeTotals=false");
  });

  it("uses the expected endpoints and methods for write operations", async () => {
    apiFetchMock.mockResolvedValueOnce({ link: { id: 1 }, repository: { id: 2 }, snapshot: { id: 3 } });
    apiFetchMock.mockResolvedValueOnce({ snapshot: { id: 4, analysedAt: "2026-01-01T00:00:00.000Z" } });
    apiFetchMock.mockResolvedValueOnce({ disconnected: true, alreadyDisconnected: false });
    apiFetchMock.mockResolvedValueOnce({ removed: { id: 1, isActive: false } });

    await linkGithubRepositoryToProject({
      projectId: 1,
      githubRepoId: 123,
      name: "repo",
      fullName: "team/repo",
      htmlUrl: "https://github.com/team/repo",
      isPrivate: false,
      ownerLogin: "team",
      defaultBranch: "main",
    });
    await analyseProjectGithubRepo(1);
    await disconnectGithubAccount();
    await removeProjectGithubRepoLink(1);

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      "/github/project-repos",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"fullName":"team/repo"'),
      })
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      "/github/project-repos/1/analyse",
      expect.objectContaining({ method: "POST" })
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      "/github/me",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      4,
      "/github/project-repos/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
