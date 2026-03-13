import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { GithubServiceError } from "./errors.js";

const serviceMocks = vi.hoisted(() => ({
  linkGithubRepositoryToProject: vi.fn(),
  removeProjectGithubRepositoryLink: vi.fn(),
  listProjectGithubRepositories: vi.fn(),
}));

vi.mock("./service.js", async () => ({
  linkGithubRepositoryToProject: serviceMocks.linkGithubRepositoryToProject,
  removeProjectGithubRepositoryLink: serviceMocks.removeProjectGithubRepositoryLink,
  listProjectGithubRepositories: serviceMocks.listProjectGithubRepositories,
  GithubServiceError,
  analyseProjectGithubRepository: vi.fn(),
  buildGithubConnectUrl: vi.fn(),
  connectGithubAccount: vi.fn(),
  disconnectGithubAccount: vi.fn(),
  getGithubConnectionStatus: vi.fn(),
  getLatestProjectGithubRepositorySnapshot: vi.fn(),
  getProjectGithubMappingCoverage: vi.fn(),
  getProjectGithubRepositorySnapshot: vi.fn(),
  listGithubRepositoriesForUser: vi.fn(),
  listLiveProjectGithubRepositoryBranchCommits: vi.fn(),
  listLiveProjectGithubRepositoryBranches: vi.fn(),
  listLiveProjectGithubRepositoryMyCommits: vi.fn(),
  listProjectGithubRepositorySnapshots: vi.fn(),
  updateProjectGithubSyncSettings: vi.fn(),
}));

import {
  linkGithubProjectRepoHandler,
  listProjectGithubReposHandler,
  removeGithubProjectRepoHandler,
} from "./controller.links.js";

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

describe("github link controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates required link payload fields before calling the service", async () => {
    const req = {
      user: { sub: 11 },
      body: {
        projectId: 1,
        githubRepoId: 2,
        name: "repo",
      },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    await linkGithubProjectRepoHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "fullName is required and must be a string" });
    expect(serviceMocks.linkGithubRepositoryToProject).not.toHaveBeenCalled();
  });

  it("creates a project repo link and serializes bigint values in the response", async () => {
    const req = {
      user: { sub: 11 },
      body: {
        projectId: 1,
        githubRepoId: 123,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
      },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.linkGithubRepositoryToProject.mockResolvedValue({
      link: { id: 50, githubRepositoryId: BigInt(77) },
      repository: { id: 77, githubRepoId: BigInt(123), fullName: "team/repo" },
      snapshot: { id: 99 },
    });

    await linkGithubProjectRepoHandler(req, res);

    expect(serviceMocks.linkGithubRepositoryToProject).toHaveBeenCalledWith(11, {
      projectId: 1,
      githubRepoId: 123,
      name: "repo",
      fullName: "team/repo",
      htmlUrl: "https://github.com/team/repo",
      isPrivate: false,
      ownerLogin: "team",
      defaultBranch: "main",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      link: { id: 50, githubRepositoryId: 77 },
      repository: { id: 77, githubRepoId: 123, fullName: "team/repo" },
      snapshot: { id: 99 },
    });
  });

  it("lists linked repositories for a valid numeric projectId query", async () => {
    const req = {
      user: { sub: 8 },
      query: { projectId: "12" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.listProjectGithubRepositories.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await listProjectGithubReposHandler(req, res);

    expect(serviceMocks.listProjectGithubRepositories).toHaveBeenCalledWith(8, 12);
    expect(res.json).toHaveBeenCalledWith({ links: [{ id: 1 }, { id: 2 }] });
  });

  it("removes a linked repository when linkId is valid", async () => {
    const req = {
      user: { sub: 8 },
      params: { linkId: "14" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.removeProjectGithubRepositoryLink.mockResolvedValue({
      id: 14,
      isActive: false,
      githubRepositoryId: BigInt(100),
    });

    await removeGithubProjectRepoHandler(req, res);

    expect(serviceMocks.removeProjectGithubRepositoryLink).toHaveBeenCalledWith(8, 14);
    expect(res.json).toHaveBeenCalledWith({
      removed: { id: 14, isActive: false, githubRepositoryId: 100 },
    });
  });

  it("maps service errors for list/remove handlers", async () => {
    const listReq = {
      user: { sub: 8 },
      query: { projectId: "12" },
    } as unknown as AuthRequest;
    const listRes = createMockResponse();
    serviceMocks.listProjectGithubRepositories.mockRejectedValue(
      new GithubServiceError(403, "You are not a member of this project")
    );

    await listProjectGithubReposHandler(listReq, listRes);

    expect(listRes.status).toHaveBeenCalledWith(403);
    expect(listRes.json).toHaveBeenCalledWith({ error: "You are not a member of this project" });
  });
});

