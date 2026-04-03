import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  listGithubRepositoriesForUser,
  listProjectGithubRepositories,
} from "./service.repositories.js";

function mockFetchResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as any;
}

function mockInstalledRepos(githubRepoIds: number[]) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(mockFetchResponse({ installations: [{ id: 101 }] }))
    .mockResolvedValueOnce(
      mockFetchResponse({
        repositories: githubRepoIds.map((id) => ({ id })),
      })
    );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("service.repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.deactivateProjectGithubRepositoryLink.mockResolvedValue(undefined);
    repoMocks.findGithubAccountByUserId.mockResolvedValue({ userId: 10, login: "alice" });
    oauthMocks.getValidGithubAccessToken.mockResolvedValue("token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns disconnected connection status when no account exists", async () => {
    repoMocks.findGithubAccountStatusByUserId.mockResolvedValue(null);

    await expect(getGithubConnectionStatus(1)).resolves.toEqual({
      connected: false,
      account: null,
    });
  });

  it("returns connected status when an account exists", async () => {
    repoMocks.findGithubAccountStatusByUserId.mockResolvedValue({ userId: 1, login: "alice" });

    await expect(getGithubConnectionStatus(1)).resolves.toEqual({
      connected: true,
      account: { userId: 1, login: "alice" },
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

  it("applies shared fuzzy matching when listing repositories", async () => {
    const repositories = [
      {
        id: 1,
        name: "Example",
        full_name: "org/Example",
        html_url: "https://github.com/org/Example",
        private: false,
        default_branch: "main",
        owner: { login: "org" },
      },
      {
        id: 2,
        name: "Data Structures",
        full_name: "org/Data Structures",
        html_url: "https://github.com/org/data-structures",
        private: false,
        default_branch: "main",
        owner: { login: "org" },
      },
      {
        id: 3,
        name: "Database Systems",
        full_name: "org/Database Systems",
        html_url: "https://github.com/org/database-systems",
        private: false,
        default_branch: "main",
        owner: { login: "org" },
      },
    ];
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) {
        return mockFetchResponse(repositories);
      }
      if (url.includes("/user/installations?")) {
        return mockFetchResponse({ installations: [] });
      }
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const droppedLetterMatches = await listGithubRepositoriesForUser(10, { query: "eampl" });
    expect(droppedLetterMatches.map((repo) => repo.name)).toEqual(["Example"]);

    const shortPrefixMatches = await listGithubRepositoriesForUser(10, { query: "daa" });
    expect(shortPrefixMatches.map((repo) => repo.name)).toEqual(["Data Structures", "Database Systems"]);
  });

  it("rejects repository listing when no GitHub account is connected", async () => {
    repoMocks.findGithubAccountByUserId.mockResolvedValue(null);

    await expect(listGithubRepositoriesForUser(10)).rejects.toMatchObject({
      status: 404,
      message: "GitHub account is not connected",
    });
  });

  it("maps installation-list API failures (401 and generic) when listing repositories", async () => {
    const unauthorizedFetch = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse([]);
      if (url.includes("/user/installations?")) return mockFetchResponse({}, 401);
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", unauthorizedFetch);

    await expect(listGithubRepositoriesForUser(10)).rejects.toEqual(
      new GithubServiceError(401, "GitHub access token is invalid or expired"),
    );

    const genericFailureFetch = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse([]);
      if (url.includes("/user/installations?")) return mockFetchResponse({}, 500);
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", genericFailureFetch);

    await expect(listGithubRepositoriesForUser(10)).rejects.toEqual(
      new GithubServiceError(502, "Failed to fetch GitHub App installations"),
    );
  });

  it("maps installation-repository API failures while loading app installation repositories", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse([]);
      if (url.includes("/user/installations?")) return mockFetchResponse({ installations: [{ id: 101 }] });
      if (url.includes("/user/installations/101/repositories")) return mockFetchResponse({}, 500);
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGithubRepositoriesForUser(10)).rejects.toEqual(
      new GithubServiceError(502, "Failed to fetch repositories for GitHub App installation"),
    );
  });

  it("maps user repository API failures (401 and generic)", async () => {
    const unauthorizedFetch = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse({}, 401);
      if (url.includes("/user/installations?")) return mockFetchResponse({ installations: [] });
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", unauthorizedFetch);

    await expect(listGithubRepositoriesForUser(10)).rejects.toEqual(
      new GithubServiceError(401, "GitHub access token is invalid or expired"),
    );

    const genericFailureFetch = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse({}, 500);
      if (url.includes("/user/installations?")) return mockFetchResponse({ installations: [] });
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", genericFailureFetch);

    await expect(listGithubRepositoriesForUser(10)).rejects.toEqual(
      new GithubServiceError(502, "Failed to fetch GitHub repositories"),
    );
  });

  it("rejects repository listing when the app is installed nowhere and no repositories are visible", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) {
        return mockFetchResponse([]);
      }
      if (url.includes("/user/installations?")) {
        return mockFetchResponse({ installations: [] });
      }
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGithubRepositoriesForUser(10)).rejects.toMatchObject({
      status: 403,
      message:
        "GitHub App is connected but not installed on any account or organization. Install the app, then try again.",
    });
  });

  it("merges direct and app-installation repositories and marks installation availability", async () => {
    const userRepo = {
      id: 1,
      name: "alpha",
      full_name: "org/alpha",
      html_url: "https://github.com/org/alpha",
      private: false,
      default_branch: "main",
      owner: { login: "org" },
    };
    const appRepo = {
      id: 2,
      name: "beta",
      full_name: "org/beta",
      html_url: "https://github.com/org/beta",
      private: true,
      default_branch: "develop",
      owner: { login: "org" },
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse([userRepo]);
      if (url.includes("/user/installations?")) return mockFetchResponse({ installations: [{ id: 101 }] });
      if (url.includes("/user/installations/101/repositories")) return mockFetchResponse({ repositories: [appRepo] });
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listGithubRepositoriesForUser(10);
    expect(result).toEqual([
      expect.objectContaining({ githubRepoId: 1, fullName: "org/alpha", isAppInstalled: false }),
      expect.objectContaining({ githubRepoId: 2, fullName: "org/beta", isAppInstalled: true }),
    ]);
  });

  it("caps user repository pagination after page 11 when pages stay full", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/installations?")) {
        return mockFetchResponse({ installations: [] });
      }
      if (url.includes("/user/repos")) {
        const page = Number(new URL(url).searchParams.get("page"));
        if (page >= 1 && page <= 11) {
          return mockFetchResponse(
            Array.from({ length: 100 }, (_, i) => ({
              id: page * 1000 + i,
              name: `repo-${page}-${i}`,
              full_name: `org/repo-${page}-${i}`,
              html_url: `https://github.com/org/repo-${page}-${i}`,
              private: false,
              default_branch: "main",
              owner: { login: "org" },
            })),
          );
        }
        return mockFetchResponse([]);
      }
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listGithubRepositoriesForUser(10);
    expect(result.length).toBe(1000);

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes("/user/repos") && url.includes("page=10"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/user/repos") && url.includes("page=11"))).toBe(false);
  });

  it("skips installations that return 403/404 when listing installation repositories", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse([]);
      if (url.includes("/user/installations?")) return mockFetchResponse({ installations: [{ id: 101 }, { id: 102 }] });
      if (url.includes("/user/installations/101/repositories")) return mockFetchResponse({}, 403);
      if (url.includes("/user/installations/102/repositories")) return mockFetchResponse({}, 404);
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGithubRepositoriesForUser(10)).resolves.toEqual([]);
  });

  it("caps installation repository pagination at 10 pages when each page stays full", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse([]);
      if (url.includes("/user/installations?")) return mockFetchResponse({ installations: [{ id: 101 }] });
      if (url.includes("/user/installations/101/repositories")) {
        const page = Number(new URL(url).searchParams.get("page"));
        if (page >= 1 && page <= 10) {
          return mockFetchResponse({
            repositories: Array.from({ length: 100 }, (_, index) => ({
              id: page * 1000 + index,
              name: `repo-${page}-${index}`,
              full_name: `org/repo-${page}-${index}`,
              html_url: `https://github.com/org/repo-${page}-${index}`,
              private: false,
              default_branch: "main",
              owner: { login: "org" },
            })),
          });
        }
        return mockFetchResponse({ repositories: [] });
      }
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const repositories = await listGithubRepositoriesForUser(10);
    expect(repositories).toHaveLength(1000);

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(
      calledUrls.some((url) => url.includes("/user/installations/101/repositories") && url.includes("page=10")),
    ).toBe(true);
    expect(
      calledUrls.some((url) => url.includes("/user/installations/101/repositories") && url.includes("page=11")),
    ).toBe(false);
  });

  it("caps installation pagination at five pages when each installations page stays full", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return mockFetchResponse([]);
      if (url.includes("/user/installations?")) {
        const page = Number(new URL(url).searchParams.get("page"));
        if (page >= 1 && page <= 5) {
          return mockFetchResponse({
            installations: Array.from({ length: 100 }, (_, index) => ({ id: page * 1000 + index })),
          });
        }
        return mockFetchResponse({ installations: [] });
      }
      if (url.includes("/user/installations/")) return mockFetchResponse({}, 404);
      return mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGithubRepositoriesForUser(10)).resolves.toEqual([]);

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes("/user/installations?") && url.includes("page=5"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/user/installations?") && url.includes("page=6"))).toBe(false);
  });

  it("lists linked project repositories for project members", async () => {
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.listProjectGithubRepositoryLinks.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(listProjectGithubRepositories(3, 99)).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(repoMocks.listProjectGithubRepositoryLinks).toHaveBeenCalledWith(99);
  });

  it("links a repository and auto-analyses a snapshot on success", async () => {
    const fetchMock = mockInstalledRepos([123]);
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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(repoMocks.upsertProjectGithubRepositoryLink).toHaveBeenCalledWith(1, 77, 10);
    expect(analysisMocks.analyseProjectGithubRepository).toHaveBeenCalledWith(10, 55);
    expect(result).toEqual({
      link: { id: 55 },
      repository: { id: 77, fullName: "team/repo" },
      snapshot: { id: 99 },
    });
  });

  it("blocks linking when the user is not a member of the project", async () => {
    repoMocks.isUserInProject.mockResolvedValue(false);

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
      }),
    ).rejects.toEqual(new GithubServiceError(403, "You are not a member of this project"));
  });

  it("blocks linking when no GitHub account is connected", async () => {
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findGithubAccountByUserId.mockResolvedValue(null);

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
      }),
    ).rejects.toEqual(new GithubServiceError(404, "GitHub account is not connected"));
  });

  it("blocks linking when a project already has an active repository link", async () => {
    mockInstalledRepos([123]);
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findActiveProjectGithubRepositoryLink.mockResolvedValue({
      repository: { fullName: "team/existing" },
    });

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
      }),
    ).rejects.toEqual(
      new GithubServiceError(
        409,
        "This project already has a linked repository (team/existing). Remove it before linking another one.",
      ),
    );
  });

  it("rolls back the fresh link when auto-analysis fails", async () => {
    mockInstalledRepos([123]);
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

  it("rethrows GithubServiceError from analysis after rollback", async () => {
    mockInstalledRepos([123]);
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findActiveProjectGithubRepositoryLink.mockResolvedValue(null);
    repoMocks.upsertGithubRepository.mockResolvedValue({ id: 77, fullName: "team/repo" });
    repoMocks.upsertProjectGithubRepositoryLink.mockResolvedValue({ id: 55 });
    const analysisError = new GithubServiceError(502, "analysis failed");
    analysisMocks.analyseProjectGithubRepository.mockRejectedValueOnce(analysisError);

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
      }),
    ).rejects.toBe(analysisError);

    expect(repoMocks.deactivateProjectGithubRepositoryLink).toHaveBeenCalledWith(55);
  });

  it("blocks linking when app access to the selected repository is missing", async () => {
    mockInstalledRepos([999]);
    repoMocks.isUserInProject.mockResolvedValue(true);

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
    ).rejects.toEqual(
      new GithubServiceError(
        409,
        "GitHub App does not have access to this repository yet. Ask the owner or organization admin to grant access, then refresh."
      )
    );

    expect(repoMocks.upsertGithubRepository).not.toHaveBeenCalled();
    expect(repoMocks.upsertProjectGithubRepositoryLink).not.toHaveBeenCalled();
  });
});
