import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGithubSnapshot,
  findGithubSnapshotById,
  findLatestGithubSnapshotByProjectLinkId,
  findLatestGithubSnapshotCoverageByProjectLinkId,
  listGithubSnapshotsByProjectLinkId,
} from "./repo.snapshots.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    githubRepoSnapshot: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("github repo.snapshots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists/fetches snapshots with expected query shapes", async () => {
    await listGithubSnapshotsByProjectLinkId(1);
    expect(prisma.githubRepoSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectGithubRepositoryId: 1 }, orderBy: { analysedAt: "desc" } })
    );

    await findGithubSnapshotById(2);
    expect(prisma.githubRepoSnapshot.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 } }));

    await findLatestGithubSnapshotCoverageByProjectLinkId(3);
    expect(prisma.githubRepoSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectGithubRepositoryId: 3 }, orderBy: { analysedAt: "desc" } })
    );

    await findLatestGithubSnapshotByProjectLinkId(4);
    expect(prisma.githubRepoSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectGithubRepositoryId: 4 }, orderBy: { analysedAt: "desc" } })
    );
  });

  it("creates snapshot transaction with user stats and repo stats", async () => {
    const tx = {
      githubRepoSnapshot: {
        create: vi.fn().mockResolvedValue({
          id: 10,
          projectGithubRepositoryId: 1,
          analysedByUserId: 2,
          analysedAt: new Date("2026-03-01T00:00:00.000Z"),
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
        }),
      },
      githubRepoSnapshotUserStat: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      githubRepoSnapshotRepoStat: { create: vi.fn().mockResolvedValue({ id: 99 }) },
      projectGithubRepository: { update: vi.fn().mockResolvedValue({ id: 1 }) },
    };
    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

    const result = await createGithubSnapshot({
      projectGithubRepositoryId: 1,
      analysedByUserId: 2,
      nextSyncIntervalMinutes: 60,
      data: { any: "payload" },
      userStats: [
        {
          mappedUserId: 1,
          contributorKey: "login:alice",
          githubUserId: BigInt(7),
          githubLogin: "alice",
          authorEmail: "a@example.com",
          isMatched: true,
          commits: 1,
          additions: 2,
          deletions: 3,
          commitsByDay: {},
          commitsByBranch: {},
          firstCommitAt: null,
          lastCommitAt: null,
        },
      ],
      repoStat: {
        totalCommits: 1,
        totalAdditions: 2,
        totalDeletions: 3,
        totalContributors: 1,
        matchedContributors: 1,
        unmatchedContributors: 0,
        unmatchedCommits: 0,
        defaultBranchCommits: 1,
        commitsByDay: {},
        commitsByBranch: {},
      },
    });

    expect(tx.githubRepoSnapshot.create).toHaveBeenCalled();
    expect(tx.githubRepoSnapshotUserStat.createMany).toHaveBeenCalled();
    expect(tx.githubRepoSnapshotRepoStat.create).toHaveBeenCalled();
    expect(tx.projectGithubRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ nextSyncAt: expect.any(Date) }),
      })
    );
    expect(result).toEqual(expect.objectContaining({ id: 10, analysedByUserId: 2 }));
  });
});
