import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { GithubServiceError } from "./errors.js";

const serviceMocks = vi.hoisted(() => ({
  buildGithubConnectUrl: vi.fn(),
  connectGithubAccount: vi.fn(),
  disconnectGithubAccount: vi.fn(),
  getGithubConnectionStatus: vi.fn(),
  listGithubRepositoriesForUser: vi.fn(),
}));

vi.mock("./service.js", async () => ({
  buildGithubConnectUrl: serviceMocks.buildGithubConnectUrl,
  connectGithubAccount: serviceMocks.connectGithubAccount,
  disconnectGithubAccount: serviceMocks.disconnectGithubAccount,
  getGithubConnectionStatus: serviceMocks.getGithubConnectionStatus,
  listGithubRepositoriesForUser: serviceMocks.listGithubRepositoriesForUser,
  GithubServiceError,
  analyseProjectGithubRepository: vi.fn(),
  getLatestProjectGithubRepositorySnapshot: vi.fn(),
  getProjectGithubMappingCoverage: vi.fn(),
  getProjectGithubRepositorySnapshot: vi.fn(),
  linkGithubRepositoryToProject: vi.fn(),
  listLiveProjectGithubRepositoryBranchCommits: vi.fn(),
  listLiveProjectGithubRepositoryBranches: vi.fn(),
  listLiveProjectGithubRepositoryMyCommits: vi.fn(),
  listProjectGithubRepositories: vi.fn(),
  listProjectGithubRepositorySnapshots: vi.fn(),
  removeProjectGithubRepositoryLink: vi.fn(),
  updateProjectGithubSyncSettings: vi.fn(),
}));

import {
  getGithubConnectUrlHandler,
  githubCallbackHandler,
  listGithubReposHandler,
} from "./controller.connect.js";

function createMockResponse() {
  const res = {} as Partial<Response> & { statusCode?: number; body?: unknown; redirectedTo?: string };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as Response["status"];

  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as Response["json"];

  res.redirect = vi.fn((target: string) => {
    res.redirectedTo = target;
    return res as Response;
  }) as unknown as Response["redirect"];

  return res as Response & { statusCode?: number; body?: unknown; redirectedTo?: string };
}

const originalEnv = { ...process.env };

describe("github connect controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, APP_BASE_URL: "http://127.0.0.1:3001" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("builds a connect URL using the current user and optional returnTo query", async () => {
    const req = {
      user: { sub: 42 },
      query: { returnTo: "http://127.0.0.1:3001/projects/1/repos" },
    } as unknown as AuthRequest;
    const res = createMockResponse();
    serviceMocks.buildGithubConnectUrl.mockResolvedValue("https://github.com/login/oauth/authorize?client_id=test");

    await getGithubConnectUrlHandler(req, res);

    expect(serviceMocks.buildGithubConnectUrl).toHaveBeenCalledWith(42, "http://127.0.0.1:3001/projects/1/repos");
    expect(res.json).toHaveBeenCalledWith({
      url: "https://github.com/login/oauth/authorize?client_id=test",
    });
  });

  it("redirects callback to the absolute returnTo URL and appends github=connected", async () => {
    const req = {
      query: { code: "abc", state: "signed-state" },
    } as unknown as AuthRequest;
    const res = createMockResponse();
    serviceMocks.connectGithubAccount.mockResolvedValue({
      userId: 42,
      githubUserId: BigInt(99),
      returnTo: "http://127.0.0.1:3001/projects/1/repos?tab=repositories",
    });

    await githubCallbackHandler(req, res);

    expect(serviceMocks.connectGithubAccount).toHaveBeenCalledWith("abc", "signed-state");
    expect(res.redirectedTo).toBe(
      "http://127.0.0.1:3001/projects/1/repos?tab=repositories&github=connected"
    );
  });

  it("redirects callback failures to the fallback path with a readable error reason", async () => {
    const req = {
      query: { code: "abc", state: "signed-state" },
    } as unknown as AuthRequest;
    const res = createMockResponse();
    serviceMocks.connectGithubAccount.mockRejectedValue(
      new GithubServiceError(400, "invalid-state")
    );

    await githubCallbackHandler(req, res);

    expect(res.redirectedTo).toBe(
      "http://127.0.0.1:3001/modules?github=error&reason=invalid-state"
    );
  });

  it("returns JSON-safe repositories and converts bigint values in the payload", async () => {
    const req = {
      user: { sub: 7 },
      query: {},
    } as unknown as AuthRequest;
    const res = createMockResponse();
    serviceMocks.listGithubRepositoriesForUser.mockResolvedValue([
      {
        githubRepoId: BigInt(123),
        fullName: "team/repo",
      },
    ]);

    await listGithubReposHandler(req, res);

    expect(serviceMocks.listGithubRepositoriesForUser).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      repos: [{ githubRepoId: 123, fullName: "team/repo" }],
    });
  });

  it("maps service errors when listing repositories", async () => {
    const req = {
      user: { sub: 7 },
      query: {},
    } as unknown as AuthRequest;
    const res = createMockResponse();
    serviceMocks.listGithubRepositoriesForUser.mockRejectedValue(
      new GithubServiceError(
        403,
        "GitHub App is connected but not installed on any account or organization. Install the app, then try again."
      )
    );

    await listGithubReposHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "GitHub App is connected but not installed on any account or organization. Install the app, then try again.",
    });
  });
});
