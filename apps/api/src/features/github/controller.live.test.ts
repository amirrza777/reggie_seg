import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { GithubServiceError } from "./errors.js";

const serviceMocks = vi.hoisted(() => ({
  listLiveProjectGithubRepositoryBranches: vi.fn(),
  listLiveProjectGithubRepositoryBranchCommits: vi.fn(),
  listLiveProjectGithubRepositoryMyCommits: vi.fn(),
  updateProjectGithubSyncSettings: vi.fn(),
}));

vi.mock("./service.js", async () => ({
  listLiveProjectGithubRepositoryBranches: serviceMocks.listLiveProjectGithubRepositoryBranches,
  listLiveProjectGithubRepositoryBranchCommits: serviceMocks.listLiveProjectGithubRepositoryBranchCommits,
  listLiveProjectGithubRepositoryMyCommits: serviceMocks.listLiveProjectGithubRepositoryMyCommits,
  updateProjectGithubSyncSettings: serviceMocks.updateProjectGithubSyncSettings,
  GithubServiceError,
  analyseProjectGithubRepository: vi.fn(),
  buildGithubConnectUrl: vi.fn(),
  connectGithubAccount: vi.fn(),
  disconnectGithubAccount: vi.fn(),
  getGithubConnectionStatus: vi.fn(),
  getLatestProjectGithubRepositorySnapshot: vi.fn(),
  getProjectGithubMappingCoverage: vi.fn(),
  getProjectGithubRepositorySnapshot: vi.fn(),
  linkGithubRepositoryToProject: vi.fn(),
  listGithubRepositoriesForUser: vi.fn(),
  listProjectGithubRepositories: vi.fn(),
  listProjectGithubRepositorySnapshots: vi.fn(),
  removeProjectGithubRepositoryLink: vi.fn(),
}));

import {
  listLiveProjectGithubRepoBranchCommitsHandler,
  listLiveProjectGithubRepoBranchesHandler,
  listLiveProjectGithubRepoMyCommitsHandler,
  updateProjectGithubSyncSettingsHandler,
} from "./controller.live.js";

function createMockResponse() {
  const res = {} as Partial<Response> & {
    statusCode?: number;
    body?: unknown;
  };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as Response["status"];

  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as Response["json"];

  return res as Response & { statusCode?: number; body?: unknown };
}

describe("github live controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists live branches for a valid link id", async () => {
    const req = {
      user: { sub: 2 },
      params: { linkId: "12" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.listLiveProjectGithubRepositoryBranches.mockResolvedValue({
      linkId: 12,
      repository: { fullName: "team/repo" },
      branches: [{ name: "main", isDefault: true, aheadBy: 0, behindBy: 0 }],
    });

    await listLiveProjectGithubRepoBranchesHandler(req, res);

    expect(serviceMocks.listLiveProjectGithubRepositoryBranches).toHaveBeenCalledWith(2, 12);
    expect(res.json).toHaveBeenCalledWith({
      linkId: 12,
      repository: { fullName: "team/repo" },
      branches: [{ name: "main", isDefault: true, aheadBy: 0, behindBy: 0 }],
    });
  });

  it("validates branch query param for live branch commits", async () => {
    const req = {
      user: { sub: 2 },
      params: { linkId: "12" },
      query: {},
    } as unknown as AuthRequest;
    const res = createMockResponse();

    await listLiveProjectGithubRepoBranchCommitsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "branch query param is required" });
    expect(serviceMocks.listLiveProjectGithubRepositoryBranchCommits).not.toHaveBeenCalled();
  });

  it("passes parsed branch and limit when fetching live branch commits", async () => {
    const req = {
      user: { sub: 5 },
      params: { linkId: "8" },
      query: { branch: " feature/login ", limit: "7" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.listLiveProjectGithubRepositoryBranchCommits.mockResolvedValue({
      linkId: 8,
      branch: "feature/login",
      commits: [{ sha: "abc123", additions: 1, deletions: 2 }],
    });

    await listLiveProjectGithubRepoBranchCommitsHandler(req, res);

    expect(serviceMocks.listLiveProjectGithubRepositoryBranchCommits).toHaveBeenCalledWith(
      5,
      8,
      "feature/login",
      7
    );
    expect(res.json).toHaveBeenCalledWith({
      linkId: 8,
      branch: "feature/login",
      commits: [{ sha: "abc123", additions: 1, deletions: 2 }],
    });
  });

  it("parses my-commits paging params and includeTotals flag", async () => {
    const req = {
      user: { sub: 9 },
      params: { linkId: "3" },
      query: { page: "2", perPage: "15", includeTotals: "false" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.listLiveProjectGithubRepositoryMyCommits.mockResolvedValue({
      linkId: 3,
      page: 2,
      perPage: 15,
      hasNextPage: false,
      totals: null,
      commits: [],
    });

    await listLiveProjectGithubRepoMyCommitsHandler(req, res);

    expect(serviceMocks.listLiveProjectGithubRepositoryMyCommits).toHaveBeenCalledWith(
      9,
      3,
      2,
      15,
      { includeTotals: false }
    );
    expect(res.json).toHaveBeenCalledWith({
      linkId: 3,
      page: 2,
      perPage: 15,
      hasNextPage: false,
      totals: null,
      commits: [],
    });
  });

  it("updates sync settings and maps GithubServiceError", async () => {
    const req = {
      user: { sub: 6 },
      params: { linkId: "4" },
      body: { autoSyncEnabled: true, syncIntervalMinutes: 60 },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.updateProjectGithubSyncSettings.mockRejectedValue(
      new GithubServiceError(403, "You are not a member of this project")
    );

    await updateProjectGithubSyncSettingsHandler(req, res);

    expect(serviceMocks.updateProjectGithubSyncSettings).toHaveBeenCalledWith(6, 4, {
      autoSyncEnabled: true,
      syncIntervalMinutes: 60,
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "You are not a member of this project" });
  });
});

