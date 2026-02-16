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
