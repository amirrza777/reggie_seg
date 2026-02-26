import { prisma } from "../../shared/db.js";

export function listGithubSnapshotsByProjectLinkId(projectGithubRepositoryId: number) {
  return prisma.githubRepoSnapshot.findMany({
    where: { projectGithubRepositoryId },
    select: {
      id: true,
      projectGithubRepositoryId: true,
      analysedByUserId: true,
      analysedAt: true,
      createdAt: true,
    },
    orderBy: { analysedAt: "desc" },
  });
}

export function findGithubSnapshotById(snapshotId: number) {
  return prisma.githubRepoSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      projectGithubRepositoryId: true,
      analysedByUserId: true,
      analysedAt: true,
      createdAt: true,
      data: true,
      repoLink: {
        select: {
          id: true,
          projectId: true,
          githubRepositoryId: true,
        },
      },
      userStats: {
        orderBy: {
          commits: "desc",
        },
        select: {
          id: true,
          mappedUserId: true,
          contributorKey: true,
          githubUserId: true,
          githubLogin: true,
          authorEmail: true,
          isMatched: true,
          commits: true,
          additions: true,
          deletions: true,
          commitsByDay: true,
          commitsByBranch: true,
          firstCommitAt: true,
          lastCommitAt: true,
          createdAt: true,
        },
      },
      repoStats: {
        select: {
          id: true,
          totalCommits: true,
          totalAdditions: true,
          totalDeletions: true,
          totalContributors: true,
          matchedContributors: true,
          unmatchedContributors: true,
          unmatchedCommits: true,
          defaultBranchCommits: true,
          commitsByDay: true,
          commitsByBranch: true,
          createdAt: true,
        },
      },
    },
  });
}

export function findLatestGithubSnapshotCoverageByProjectLinkId(projectGithubRepositoryId: number) {
  return prisma.githubRepoSnapshot.findFirst({
    where: { projectGithubRepositoryId },
    orderBy: { analysedAt: "desc" },
    select: {
      id: true,
      analysedAt: true,
      repoStats: {
        select: {
          totalCommits: true,
          totalContributors: true,
          matchedContributors: true,
          unmatchedContributors: true,
          unmatchedCommits: true,
        },
      },
    },
  });
}

export function findLatestGithubSnapshotByProjectLinkId(projectGithubRepositoryId: number) {
  return prisma.githubRepoSnapshot.findFirst({
    where: { projectGithubRepositoryId },
    orderBy: { analysedAt: "desc" },
    select: {
      id: true,
      projectGithubRepositoryId: true,
      analysedByUserId: true,
      analysedAt: true,
      createdAt: true,
      data: true,
      repoLink: {
        select: {
          id: true,
          projectId: true,
          githubRepositoryId: true,
        },
      },
      userStats: {
        orderBy: {
          commits: "desc",
        },
        select: {
          id: true,
          mappedUserId: true,
          contributorKey: true,
          githubUserId: true,
          githubLogin: true,
          authorEmail: true,
          isMatched: true,
          commits: true,
          additions: true,
          deletions: true,
          commitsByDay: true,
          commitsByBranch: true,
          firstCommitAt: true,
          lastCommitAt: true,
          createdAt: true,
        },
      },
      repoStats: {
        select: {
          id: true,
          totalCommits: true,
          totalAdditions: true,
          totalDeletions: true,
          totalContributors: true,
          matchedContributors: true,
          unmatchedContributors: true,
          unmatchedCommits: true,
          defaultBranchCommits: true,
          commitsByDay: true,
          commitsByBranch: true,
          createdAt: true,
        },
      },
    },
  });
}

type CreateGithubSnapshotInput = {
  projectGithubRepositoryId: number;
  analysedByUserId: number;
  nextSyncIntervalMinutes: number;
  data: unknown;
  userStats: Array<{
    mappedUserId: number | null;
    contributorKey: string;
    githubUserId: bigint | null;
    githubLogin: string | null;
    authorEmail: string | null;
    isMatched: boolean;
    commits: number;
    additions: number;
    deletions: number;
    commitsByDay: unknown;
    commitsByBranch: unknown;
    firstCommitAt: Date | null;
    lastCommitAt: Date | null;
  }>;
  repoStat: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    totalContributors: number;
    matchedContributors: number;
    unmatchedContributors: number;
    unmatchedCommits: number;
    defaultBranchCommits: number;
    commitsByDay: unknown;
    commitsByBranch: unknown;
  };
};

export async function createGithubSnapshot(input: CreateGithubSnapshotInput) {
  return prisma.$transaction(async (tx) => {
    const snapshot = await tx.githubRepoSnapshot.create({
      data: {
        projectGithubRepositoryId: input.projectGithubRepositoryId,
        analysedByUserId: input.analysedByUserId,
        data: input.data as any,
      },
      select: {
        id: true,
        projectGithubRepositoryId: true,
        analysedByUserId: true,
        analysedAt: true,
        createdAt: true,
      },
    });

    if (input.userStats.length > 0) {
      await tx.githubRepoSnapshotUserStat.createMany({
        data: input.userStats.map((stat) => ({
          snapshotId: snapshot.id,
          mappedUserId: stat.mappedUserId,
          contributorKey: stat.contributorKey,
          githubUserId: stat.githubUserId,
          githubLogin: stat.githubLogin,
          authorEmail: stat.authorEmail,
          isMatched: stat.isMatched,
          commits: stat.commits,
          additions: stat.additions,
          deletions: stat.deletions,
          commitsByDay: stat.commitsByDay as any,
          commitsByBranch: stat.commitsByBranch as any,
          firstCommitAt: stat.firstCommitAt,
          lastCommitAt: stat.lastCommitAt,
        })),
      });
    }

    await tx.githubRepoSnapshotRepoStat.create({
      data: {
        snapshotId: snapshot.id,
        totalCommits: input.repoStat.totalCommits,
        totalAdditions: input.repoStat.totalAdditions,
        totalDeletions: input.repoStat.totalDeletions,
        totalContributors: input.repoStat.totalContributors,
        matchedContributors: input.repoStat.matchedContributors,
        unmatchedContributors: input.repoStat.unmatchedContributors,
        unmatchedCommits: input.repoStat.unmatchedCommits,
        defaultBranchCommits: input.repoStat.defaultBranchCommits,
        commitsByDay: input.repoStat.commitsByDay as any,
        commitsByBranch: input.repoStat.commitsByBranch as any,
      },
    });

    await tx.projectGithubRepository.update({
      where: { id: input.projectGithubRepositoryId },
      data: {
        lastSyncedAt: snapshot.analysedAt,
        nextSyncAt: new Date(snapshot.analysedAt.getTime() + input.nextSyncIntervalMinutes * 60 * 1000),
      },
    });

    return snapshot;
  });
}
