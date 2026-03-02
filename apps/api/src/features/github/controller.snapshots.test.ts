import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { GithubServiceError } from "./errors.js";

const serviceMocks = vi.hoisted(() => ({
  getLatestProjectGithubRepositorySnapshot: vi.fn(),
  getProjectGithubMappingCoverage: vi.fn(),
  getProjectGithubRepositorySnapshot: vi.fn(),
  listProjectGithubRepositorySnapshots: vi.fn(),
}));

vi.mock("./service.js", async () => ({
  getLatestProjectGithubRepositorySnapshot: serviceMocks.getLatestProjectGithubRepositorySnapshot,
  getProjectGithubMappingCoverage: serviceMocks.getProjectGithubMappingCoverage,
  getProjectGithubRepositorySnapshot: serviceMocks.getProjectGithubRepositorySnapshot,
  listProjectGithubRepositorySnapshots: serviceMocks.listProjectGithubRepositorySnapshots,
  GithubServiceError,
  analyseProjectGithubRepository: vi.fn(),
  buildGithubConnectUrl: vi.fn(),
  connectGithubAccount: vi.fn(),
  disconnectGithubAccount: vi.fn(),
  getGithubConnectionStatus: vi.fn(),
  linkGithubRepositoryToProject: vi.fn(),
  listGithubRepositoriesForUser: vi.fn(),
  listLiveProjectGithubRepositoryBranchCommits: vi.fn(),
  listLiveProjectGithubRepositoryBranches: vi.fn(),
  listLiveProjectGithubRepositoryMyCommits: vi.fn(),
  listProjectGithubRepositories: vi.fn(),
  removeProjectGithubRepositoryLink: vi.fn(),
  updateProjectGithubSyncSettings: vi.fn(),
}));

import {
  getGithubSnapshotHandler,
  getLatestProjectGithubRepoSnapshotHandler,
  getProjectGithubMappingCoverageHandler,
  listProjectGithubRepoSnapshotsHandler,
} from "./controller.snapshots.js";

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

describe("github snapshot controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists snapshots for a valid link id and serializes bigint values", async () => {
    const req = {
      user: { sub: 10 },
      params: { linkId: "7" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.listProjectGithubRepositorySnapshots.mockResolvedValue([
      { id: 1, githubRepoId: BigInt(123), analysedAt: "2026-02-26T12:00:00.000Z" },
    ]);

    await listProjectGithubRepoSnapshotsHandler(req, res);

    expect(serviceMocks.listProjectGithubRepositorySnapshots).toHaveBeenCalledWith(10, 7);
    expect(res.json).toHaveBeenCalledWith({
      snapshots: [{ id: 1, githubRepoId: 123, analysedAt: "2026-02-26T12:00:00.000Z" }],
    });
  });

  it("returns 400 for invalid snapshot id when fetching a single snapshot", async () => {
    const req = {
      user: { sub: 10 },
      params: { snapshotId: "not-a-number" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    await getGithubSnapshotHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "snapshotId must be a number" });
    expect(serviceMocks.getProjectGithubRepositorySnapshot).not.toHaveBeenCalled();
  });

  it("returns latest snapshot payload for a link", async () => {
    const req = {
      user: { sub: 4 },
      params: { linkId: "12" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.getLatestProjectGithubRepositorySnapshot.mockResolvedValue({
      id: 88,
      repoLinkId: 12,
      repoStats: [{ totalCommits: 5 }],
    });

    await getLatestProjectGithubRepoSnapshotHandler(req, res);

    expect(serviceMocks.getLatestProjectGithubRepositorySnapshot).toHaveBeenCalledWith(4, 12);
    expect(res.json).toHaveBeenCalledWith({
      snapshot: {
        id: 88,
        repoLinkId: 12,
        repoStats: [{ totalCommits: 5 }],
      },
    });
  });

  it("returns mapping coverage for a valid link id", async () => {
    const req = {
      user: { sub: 3 },
      params: { linkId: "5" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.getProjectGithubMappingCoverage.mockResolvedValue({
      linkId: 5,
      snapshotId: 20,
      analysedAt: "2026-02-26T13:00:00.000Z",
      coverage: {
        totalContributors: 4,
        matchedContributors: 3,
        unmatchedContributors: 1,
        totalCommits: 40,
        unmatchedCommits: 6,
      },
    });

    await getProjectGithubMappingCoverageHandler(req, res);

    expect(serviceMocks.getProjectGithubMappingCoverage).toHaveBeenCalledWith(3, 5);
    expect(res.json).toHaveBeenCalledWith({
      mappingCoverage: {
        linkId: 5,
        snapshotId: 20,
        analysedAt: "2026-02-26T13:00:00.000Z",
        coverage: {
          totalContributors: 4,
          matchedContributors: 3,
          unmatchedContributors: 1,
          totalCommits: 40,
          unmatchedCommits: 6,
        },
      },
    });
  });

  it("maps GithubServiceError when latest snapshot lookup is forbidden", async () => {
    const req = {
      user: { sub: 4 },
      params: { linkId: "12" },
    } as unknown as AuthRequest;
    const res = createMockResponse();

    serviceMocks.getLatestProjectGithubRepositorySnapshot.mockRejectedValue(
      new GithubServiceError(403, "You are not a member of this project")
    );

    await getLatestProjectGithubRepoSnapshotHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "You are not a member of this project",
    });
  });
});

