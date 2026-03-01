import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  findGithubSnapshotById: vi.fn(),
  findLatestGithubSnapshotByProjectLinkId: vi.fn(),
  findLatestGithubSnapshotCoverageByProjectLinkId: vi.fn(),
  findProjectGithubRepositoryLinkById: vi.fn(),
  isUserInProject: vi.fn(),
  listGithubSnapshotsByProjectLinkId: vi.fn(),
  updateProjectGithubRepositorySyncSettings: vi.fn(),
}));

vi.mock("./repo.js", () => repoMocks);

import {
  getLatestProjectGithubRepositorySnapshot,
  getProjectGithubMappingCoverage,
  getProjectGithubRepositorySnapshot,
  listProjectGithubRepositorySnapshots,
  updateProjectGithubSyncSettings,
} from "./service.snapshots.js";

describe("service.snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists snapshots when the user is a project member", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({ id: 5, projectId: 99 });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.listGithubSnapshotsByProjectLinkId.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(listProjectGithubRepositorySnapshots(7, 5)).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(repoMocks.listGithubSnapshotsByProjectLinkId).toHaveBeenCalledWith(5);
  });

  it("returns a snapshot when found and user is a member", async () => {
    repoMocks.findGithubSnapshotById.mockResolvedValue({
      id: 10,
      repoLink: { projectId: 77 },
    });
    repoMocks.isUserInProject.mockResolvedValue(true);

    await expect(getProjectGithubRepositorySnapshot(3, 10)).resolves.toEqual({
      id: 10,
      repoLink: { projectId: 77 },
    });
  });

  it("returns latest snapshot and maps missing latest snapshot to 404", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({ id: 9, projectId: 12 });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findLatestGithubSnapshotByProjectLinkId
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce(null);

    await expect(getLatestProjectGithubRepositorySnapshot(4, 9)).resolves.toEqual({ id: 101 });
    await expect(getLatestProjectGithubRepositorySnapshot(4, 9)).rejects.toMatchObject({
      status: 404,
      message: "No snapshots found for this project repository link",
    });
  });

  it("returns null coverage payload when no latest coverage stats exist", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({ id: 11, projectId: 22 });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findLatestGithubSnapshotCoverageByProjectLinkId.mockResolvedValue(null);

    await expect(getProjectGithubMappingCoverage(2, 11)).resolves.toEqual({
      linkId: 11,
      snapshotId: null,
      analysedAt: null,
      coverage: null,
    });
  });

  it("maps latest coverage stats into a compact response", async () => {
    const analysedAt = new Date("2026-02-26T10:00:00.000Z");
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({ id: 11, projectId: 22 });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.findLatestGithubSnapshotCoverageByProjectLinkId.mockResolvedValue({
      id: 88,
      analysedAt,
      repoStats: {
        totalContributors: 6,
        matchedContributors: 5,
        unmatchedContributors: 1,
        totalCommits: 120,
        unmatchedCommits: 7,
      },
    });

    await expect(getProjectGithubMappingCoverage(2, 11)).resolves.toEqual({
      linkId: 11,
      snapshotId: 88,
      analysedAt,
      coverage: {
        totalContributors: 6,
        matchedContributors: 5,
        unmatchedContributors: 1,
        totalCommits: 120,
        unmatchedCommits: 7,
      },
    });
  });

  it("clamps sync interval and forwards the settings update", async () => {
    repoMocks.findProjectGithubRepositoryLinkById.mockResolvedValue({ id: 44, projectId: 9 });
    repoMocks.isUserInProject.mockResolvedValue(true);
    repoMocks.updateProjectGithubRepositorySyncSettings.mockResolvedValue({
      id: 44,
      autoSyncEnabled: true,
      syncIntervalMinutes: 15,
    });

    await updateProjectGithubSyncSettings(1, 44, {
      autoSyncEnabled: true,
      syncIntervalMinutes: 1,
    });
    expect(repoMocks.updateProjectGithubRepositorySyncSettings).toHaveBeenCalledWith({
      linkId: 44,
      autoSyncEnabled: true,
      syncIntervalMinutes: 15,
    });

    await updateProjectGithubSyncSettings(1, 44, {
      autoSyncEnabled: false,
      syncIntervalMinutes: 5000,
    });
    expect(repoMocks.updateProjectGithubRepositorySyncSettings).toHaveBeenLastCalledWith({
      linkId: 44,
      autoSyncEnabled: false,
      syncIntervalMinutes: 1440,
    });
  });
});
