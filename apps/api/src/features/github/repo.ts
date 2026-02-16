import { prisma } from "../../shared/db.js";

export function findUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
}

export function findGithubAccountByGithubUserId(githubUserId: bigint) {
  return prisma.githubAccount.findUnique({
    where: { githubUserId },
    select: { userId: true },
  });
}

export function findGithubAccountByUserId(userId: number) {
  return prisma.githubAccount.findUnique({
    where: { userId },
    select: {
      userId: true,
      accessTokenEncrypted: true,
      accessTokenExpiresAt: true,
      refreshTokenEncrypted: true,
      refreshTokenExpiresAt: true,
      tokenType: true,
      scopes: true,
      login: true,
    },
  });
}

type UpdateGithubAccountTokensInput = {
  userId: number;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenType: string | null;
  scopes: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
};

export function updateGithubAccountTokens(input: UpdateGithubAccountTokensInput) {
  return prisma.githubAccount.update({
    where: { userId: input.userId },
    data: {
      accessTokenEncrypted: input.accessTokenEncrypted,
      refreshTokenEncrypted: input.refreshTokenEncrypted,
      tokenType: input.tokenType,
      scopes: input.scopes,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt,
      tokenLastRefreshedAt: new Date(),
    },
    select: {
      userId: true,
      accessTokenEncrypted: true,
      accessTokenExpiresAt: true,
      refreshTokenEncrypted: true,
      refreshTokenExpiresAt: true,
      tokenType: true,
      scopes: true,
      login: true,
    },
  });
}

export async function isUserInProject(userId: number, projectId: number) {
  const allocation = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: {
        projectId,
      },
    },
    select: { userId: true },
  });

  return Boolean(allocation);
}

export async function listProjectGithubIdentityCandidates(projectId: number) {
  const rows = await prisma.teamAllocation.findMany({
    where: {
      team: {
        projectId,
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          githubAccount: {
            select: {
              login: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    userId: row.userId,
    githubLogin: row.user.githubAccount?.login || null,
    githubEmail: row.user.githubAccount?.email || null,
  }));
}

type UpsertGithubRepositoryInput = {
  githubRepoId: bigint;
  ownerLogin: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  defaultBranch: string | null;
};

export function upsertGithubRepository(input: UpsertGithubRepositoryInput) {
  return prisma.githubRepository.upsert({
    where: { githubRepoId: input.githubRepoId },
    create: {
      githubRepoId: input.githubRepoId,
      ownerLogin: input.ownerLogin,
      name: input.name,
      fullName: input.fullName,
      htmlUrl: input.htmlUrl,
      isPrivate: input.isPrivate,
      defaultBranch: input.defaultBranch,
    },
    update: {
      ownerLogin: input.ownerLogin,
      name: input.name,
      fullName: input.fullName,
      htmlUrl: input.htmlUrl,
      isPrivate: input.isPrivate,
      defaultBranch: input.defaultBranch,
    },
    select: {
      id: true,
      githubRepoId: true,
      ownerLogin: true,
      name: true,
      fullName: true,
      htmlUrl: true,
      isPrivate: true,
      defaultBranch: true,
    },
  });
}

export function upsertProjectGithubRepositoryLink(projectId: number, githubRepositoryId: number, linkedByUserId: number) {
  return prisma.projectGithubRepository.upsert({
    where: {
      projectId_githubRepositoryId: {
        projectId,
        githubRepositoryId,
      },
    },
    create: {
      projectId,
      githubRepositoryId,
      linkedByUserId,
      isActive: true,
    },
    update: {
      isActive: true,
      autoSyncEnabled: true,
      syncIntervalMinutes: 60,
      nextSyncAt: null,
    },
    select: {
      id: true,
      projectId: true,
      githubRepositoryId: true,
      linkedByUserId: true,
      isActive: true,
      autoSyncEnabled: true,
      syncIntervalMinutes: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export function listProjectGithubRepositoryLinks(projectId: number) {
  return prisma.projectGithubRepository.findMany({
    where: {
      projectId,
      isActive: true,
    },
    select: {
      id: true,
      projectId: true,
      githubRepositoryId: true,
      linkedByUserId: true,
      isActive: true,
      autoSyncEnabled: true,
      syncIntervalMinutes: true,
      lastSyncedAt: true,
      nextSyncAt: true,
      createdAt: true,
      updatedAt: true,
      repository: {
        select: {
          id: true,
          githubRepoId: true,
          ownerLogin: true,
          name: true,
          fullName: true,
          htmlUrl: true,
          isPrivate: true,
          defaultBranch: true,
          pushedAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findProjectGithubRepositoryLinkById(linkId: number) {
  return prisma.projectGithubRepository.findUnique({
    where: { id: linkId },
    select: {
      id: true,
      projectId: true,
      githubRepositoryId: true,
      syncIntervalMinutes: true,
      repository: {
        select: {
          id: true,
          githubRepoId: true,
          ownerLogin: true,
          name: true,
          fullName: true,
          htmlUrl: true,
          isPrivate: true,
          defaultBranch: true,
        },
      },
    },
  });
}

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

type UpsertGithubAccountInput = {
  userId: number;
  githubUserId: bigint;
  login: string;
  email: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenType: string | null;
  scopes: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
};

export function upsertGithubAccount(input: UpsertGithubAccountInput) {
  return prisma.githubAccount.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      githubUserId: input.githubUserId,
      login: input.login,
      email: input.email,
      accessTokenEncrypted: input.accessTokenEncrypted,
      refreshTokenEncrypted: input.refreshTokenEncrypted,
      tokenType: input.tokenType,
      scopes: input.scopes,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt,
      tokenLastRefreshedAt: new Date(),
    },
    update: {
      githubUserId: input.githubUserId,
      login: input.login,
      email: input.email,
      accessTokenEncrypted: input.accessTokenEncrypted,
      refreshTokenEncrypted: input.refreshTokenEncrypted,
      tokenType: input.tokenType,
      scopes: input.scopes,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt,
      tokenLastRefreshedAt: new Date(),
    },
    select: {
      id: true,
      userId: true,
      login: true,
      email: true,
      scopes: true,
      accessTokenExpiresAt: true,
      refreshTokenExpiresAt: true,
      updatedAt: true,
    },
  });
}
