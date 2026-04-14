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

describe("github api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it("requests connection status and connect URL", async () => {
    await getGithubConnectionStatus();
    await getGithubConnectUrl();
    await getGithubConnectUrl("/staff/repos?projectId=5");

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/github/me");
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/github/connect");
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      "/github/connect?returnTo=%2Fstaff%2Frepos%3FprojectId%3D5",
    );
  });

  it("lists repositories with and without trimmed query", async () => {
    apiFetchMock.mockResolvedValueOnce({ repos: [{ id: 1 }] });
    apiFetchMock.mockResolvedValueOnce({ repos: [{ id: 2 }] });

    await expect(listGithubRepositories()).resolves.toEqual([{ id: 1 }]);
    await expect(listGithubRepositories({ query: "  platform  " })).resolves.toEqual([{ id: 2 }]);

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/github/repos");
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/github/repos?q=platform");
  });

  it("handles project links and repository linking/removal endpoints", async () => {
    apiFetchMock.mockResolvedValueOnce({ links: [{ id: 11 }] });

    await expect(listProjectGithubRepoLinks(42)).resolves.toEqual([{ id: 11 }]);

    await linkGithubRepositoryToProject({
      projectId: 42,
      githubRepoId: 500,
      name: "demo",
      fullName: "org/demo",
      htmlUrl: "https://github.com/org/demo",
      isPrivate: false,
      ownerLogin: "org",
      defaultBranch: "main",
    });

    await removeProjectGithubRepoLink(11);

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/github/project-repos?projectId=42");
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      "/github/project-repos",
      expect.objectContaining({ method: "POST" }),
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      "/github/project-repos/11",
      { method: "DELETE" },
    );
  });

  it("calls snapshot, analysis, and mapping endpoints", async () => {
    apiFetchMock.mockResolvedValueOnce({ mappingCoverage: { coverage: {} } });

    await getLatestProjectGithubSnapshot(99);
    await analyseProjectGithubRepo(99);
    await getProjectGithubMappingCoverage(99);

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/github/project-repos/99/latest-snapshot");
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/github/project-repos/99/analyse", { method: "POST" });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/github/project-repos/99/mapping-coverage");
  });

  it("builds branch and commit query strings", async () => {
    await listLiveProjectGithubRepoBranches(7);
    await listLiveProjectGithubRepoBranches(7, { query: "  release  " });
    await listLiveProjectGithubRepoBranchCommits(7, "main", 20);
    await listLiveProjectGithubRepoMyCommits(7);
    await listLiveProjectGithubRepoMyCommits(7, 2, 25, { includeTotals: false });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/github/project-repos/7/branches");
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/github/project-repos/7/branches?q=release");
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/github/project-repos/7/branch-commits?branch=main&limit=20");
    expect(apiFetchMock).toHaveBeenNthCalledWith(4, "/github/project-repos/7/my-commits?page=1&perPage=10");
    expect(apiFetchMock).toHaveBeenNthCalledWith(5, "/github/project-repos/7/my-commits?page=2&perPage=25&includeTotals=false");
  });

  it("disconnects github account", async () => {
    await disconnectGithubAccount();
    expect(apiFetchMock).toHaveBeenCalledWith("/github/me", { method: "DELETE" });
  });
});
