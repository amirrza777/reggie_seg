import { prisma } from "../../shared/db.js";

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

export function findActiveProjectGithubRepositoryLink(projectId: number) {
  return prisma.projectGithubRepository.findFirst({
    where: {
      projectId,
      isActive: true,
    },
    select: {
      id: true,
      projectId: true,
      githubRepositoryId: true,
      repository: {
        select: {
          fullName: true,
        },
      },
    },
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

type UpdateProjectGithubRepositorySyncSettingsInput = {
  linkId: number;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
};

export function updateProjectGithubRepositorySyncSettings(input: UpdateProjectGithubRepositorySyncSettingsInput) {
  const nextSyncAt = input.autoSyncEnabled
    ? new Date(Date.now() + input.syncIntervalMinutes * 60 * 1000)
    : null;

  return prisma.projectGithubRepository.update({
    where: { id: input.linkId },
    data: {
      autoSyncEnabled: input.autoSyncEnabled,
      syncIntervalMinutes: input.syncIntervalMinutes,
      nextSyncAt,
    },
    select: {
      id: true,
      projectId: true,
      githubRepositoryId: true,
      autoSyncEnabled: true,
      syncIntervalMinutes: true,
      lastSyncedAt: true,
      nextSyncAt: true,
      updatedAt: true,
    },
  });
}

export function deactivateProjectGithubRepositoryLink(linkId: number) {
  return prisma.projectGithubRepository.update({
    where: { id: linkId },
    data: {
      isActive: false,
      autoSyncEnabled: false,
      nextSyncAt: null,
    },
    select: {
      id: true,
      projectId: true,
      githubRepositoryId: true,
      isActive: true,
      autoSyncEnabled: true,
      nextSyncAt: true,
      updatedAt: true,
    },
  });
}
