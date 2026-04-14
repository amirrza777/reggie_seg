import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GithubServiceError } from "./errors.js";
import { registerServiceRepositoriesExtraTests } from "./service.repositories.additional-cases.js";

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
vi.mock("./analysis/service.analysis.run.js", () => ({
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

  registerServiceRepositoriesExtraTests({
    disconnectGithubAccount,
    getGithubConnectionStatus,
    linkGithubRepositoryToProject,
    listGithubRepositoriesForUser,
    listProjectGithubRepositories,
    mockFetchResponse,
    mockInstalledRepos,
    repoMocks,
    analysisMocks,
  });
});
