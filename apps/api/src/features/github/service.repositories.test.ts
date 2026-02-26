import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubServiceError } from "./errors.js";

const repoMocks = vi.hoisted(() => ({
  deactivateProjectGithubRepositoryLink: vi.fn(),
  findActiveProjectGithubRepositoryLink: vi.fn(),
  deleteGithubAccountByUserId: vi.fn(),
  findGithubAccountStatusByUserId: vi.fn(),
  findGithubAccountByUserId: vi.fn(),
  isUserInProject: vi.fn(),
  listProjectGithubRepositoryLinks: vi.fn(),
  upsertGithubRepository: vi.fn(),
  upsertProjectGithubRepositoryLink: vi.fn(),
}));

const oauthMocks = vi.hoisted(() => ({
  getValidGithubAccessToken: vi.fn(),
}));

const analysisMocks = vi.hoisted(() => ({
  analyseProjectGithubRepository: vi.fn(),
}));

vi.mock("./repo.js", () => repoMocks);
vi.mock("./oauth.service.js", () => ({
  getValidGithubAccessToken: oauthMocks.getValidGithubAccessToken,
}));
vi.mock("./service.analysis.run.js", () => ({
  analyseProjectGithubRepository: analysisMocks.analyseProjectGithubRepository,
}));
vi.mock("./config.js", () => ({
  getGitHubApiConfig: () => ({ baseUrl: "https://api.github.com" }),
}));

import {
  disconnectGithubAccount,
  getGithubConnectionStatus,
  linkGithubRepositoryToProject,
  listProjectGithubRepositories,
} from "./service.repositories.js";

describe("service.repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.deactivateProjectGithubRepositoryLink.mockResolvedValue(undefined);
  });

  it("returns disconnected connection status when no account exists", async () => {
    repoMocks.findGithubAccountStatusByUserId.mockResolvedValue(null);

    await expect(getGithubConnectionStatus(1)).resolves.toEqual({
      connected: false,
      account: null,
    });
  });

  it("disconnects an existing github account and handles already-disconnected", async () => {
    repoMocks.findGithubAccountStatusByUserId
      .mockResolvedValueOnce({ userId: 1, login: "alice" })
      .mockResolvedValueOnce(null);

    await expect(disconnectGithubAccount(1)).resolves.toEqual({
      disconnected: true,
      alreadyDisconnected: false,
    });
    expect(repoMocks.deleteGithubAccountByUserId).toHaveBeenCalledWith(1);

    await expect(disconnectGithubAccount(1)).resolves.toEqual({
      disconnected: true,
      alreadyDisconnected: true,
    });
  });

  it("enforces project membership when listing project repositories", async () => {
    repoMocks.isUserInProject.mockResolvedValue(false);

    await expect(listProjectGithubRepositories(3, 99)).rejects.toMatchObject({
      status: 403,
      message: "You are not a member of this project",
    });
  });

  it("links a repository and auto-analyses a snapshot on success", async () => {
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findActiveProjectGithubRepositoryLink.mockResolvedValue(null);
    repoMocks.upsertGithubRepository.mockResolvedValue({ id: 77, fullName: "team/repo" });
    repoMocks.upsertProjectGithubRepositoryLink.mockResolvedValue({ id: 55 });
    analysisMocks.analyseProjectGithubRepository.mockResolvedValue({ id: 99 });

    const result = await linkGithubRepositoryToProject(10, {
      projectId: 1,
      githubRepoId: 123,
      name: "repo",
      fullName: "team/repo",
      htmlUrl: "https://github.com/team/repo",
      isPrivate: false,
      ownerLogin: "team",
      defaultBranch: "main",
    });

    expect(repoMocks.upsertGithubRepository).toHaveBeenCalledWith(
      expect.objectContaining({ githubRepoId: BigInt(123), fullName: "team/repo" })
    );
    expect(repoMocks.upsertProjectGithubRepositoryLink).toHaveBeenCalledWith(1, 77, 10);
    expect(analysisMocks.analyseProjectGithubRepository).toHaveBeenCalledWith(10, 55);
    expect(result).toEqual({
      link: { id: 55 },
      repository: { id: 77, fullName: "team/repo" },
      snapshot: { id: 99 },
    });
  });

  it("rolls back the fresh link when auto-analysis fails", async () => {
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findActiveProjectGithubRepositoryLink.mockResolvedValue(null);
    repoMocks.upsertGithubRepository.mockResolvedValue({ id: 77, fullName: "team/repo" });
    repoMocks.upsertProjectGithubRepositoryLink.mockResolvedValue({ id: 55 });
    analysisMocks.analyseProjectGithubRepository.mockRejectedValue(new Error("boom"));

    await expect(
      linkGithubRepositoryToProject(10, {
        projectId: 1,
        githubRepoId: 123,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
      })
    ).rejects.toEqual(new GithubServiceError(502, "Repository linked but analysis failed. Please try linking again."));

    expect(repoMocks.deactivateProjectGithubRepositoryLink).toHaveBeenCalledWith(55);
  });
});
