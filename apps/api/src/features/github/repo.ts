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
