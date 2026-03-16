import { prisma } from "../../shared/db.js";

/** Returns the user by ID. */
export function findUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
}

/** Returns the GitHub account by GitHub user ID. */
export function findGithubAccountByGithubUserId(githubUserId: bigint) {
  return prisma.githubAccount.findUnique({
    where: { githubUserId },
    select: { userId: true },
  });
}

/** Returns the GitHub account by user ID. */
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

/** Returns the GitHub account status by user ID. */
export function findGithubAccountStatusByUserId(userId: number) {
  return prisma.githubAccount.findUnique({
    where: { userId },
    select: {
      userId: true,
      login: true,
      email: true,
      scopes: true,
      tokenType: true,
      accessTokenExpiresAt: true,
      refreshTokenExpiresAt: true,
      tokenLastRefreshedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Deletes the GitHub account by user ID. */
export async function deleteGithubAccountByUserId(userId: number) {
  await prisma.githubAccount.delete({
    where: { userId },
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

/** Updates the GitHub account tokens. */
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

/** Executes the upsert GitHub account. */
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
