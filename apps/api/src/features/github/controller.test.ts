import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { GithubServiceError } from "./errors.js";

const serviceMocks = vi.hoisted(() => ({
  analyseProjectGithubRepository: vi.fn(),
}));

vi.mock("./service.js", async () => {
  return {
    analyseProjectGithubRepository: serviceMocks.analyseProjectGithubRepository,
    buildGithubConnectUrl: vi.fn(),
    connectGithubAccount: vi.fn(),
    disconnectGithubAccount: vi.fn(),
    getGithubConnectionStatus: vi.fn(),
    getLatestProjectGithubRepositorySnapshot: vi.fn(),
    listLiveProjectGithubRepositoryBranchCommits: vi.fn(),
    listLiveProjectGithubRepositoryBranches: vi.fn(),
    listLiveProjectGithubRepositoryMyCommits: vi.fn(),
    getProjectGithubMappingCoverage: vi.fn(),
    getProjectGithubRepositorySnapshot: vi.fn(),
    GithubServiceError,
    linkGithubRepositoryToProject: vi.fn(),
    removeProjectGithubRepositoryLink: vi.fn(),
    listProjectGithubRepositorySnapshots: vi.fn(),
    listProjectGithubRepositories: vi.fn(),
    listGithubRepositoriesForUser: vi.fn(),
    updateProjectGithubSyncSettings: vi.fn(),
  };
});

import { analyseProjectGithubRepoHandler } from "./controller.js";

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

describe("analyseProjectGithubRepoHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = {
      params: { linkId: "1" },
      user: undefined,
    } as unknown as AuthRequest;
    const res = createMockResponse();

    await analyseProjectGithubRepoHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(serviceMocks.analyseProjectGithubRepository).not.toHaveBeenCalled();
  });

  it("returns 400 when linkId is not numeric", async () => {
    const req = {
      params: { linkId: "abc" },
      user: { sub: 10 },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    await analyseProjectGithubRepoHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "linkId must be a number" });
    expect(serviceMocks.analyseProjectGithubRepository).not.toHaveBeenCalled();
  });

  it("returns 201 with snapshot payload when analysis succeeds", async () => {
    const req = {
      params: { linkId: "42" },
      user: { sub: 7 },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.analyseProjectGithubRepository.mockResolvedValue({
      id: 99,
      githubRepoId: BigInt(123),
      analysedAt: "2026-02-26T10:00:00.000Z",
    });

    await analyseProjectGithubRepoHandler(req, res);

    expect(serviceMocks.analyseProjectGithubRepository).toHaveBeenCalledWith(7, 42);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      snapshot: {
        id: 99,
        githubRepoId: 123,
        analysedAt: "2026-02-26T10:00:00.000Z",
      },
    });
  });

  it("maps GithubServiceError to its status and message", async () => {
    const req = {
      params: { linkId: "42" },
      user: { sub: 7 },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.analyseProjectGithubRepository.mockRejectedValue(
      new GithubServiceError(403, "You are not a member of this project")
    );

    await analyseProjectGithubRepoHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "You are not a member of this project",
    });
  });

  it("returns 500 for unexpected errors", async () => {
    const req = {
      params: { linkId: "42" },
      user: { sub: 7 },
    } as unknown as AuthRequest;
    const res = createMockResponse();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    serviceMocks.analyseProjectGithubRepository.mockRejectedValue(new Error("boom"));

    await analyseProjectGithubRepoHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to analyse project GitHub repository",
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
