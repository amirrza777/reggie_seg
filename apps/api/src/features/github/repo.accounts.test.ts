import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteGithubAccountByUserId,
  findGithubAccountByGithubUserId,
  findGithubAccountByUserId,
  findGithubAccountStatusByUserId,
  findUserById,
  updateGithubAccountTokens,
  upsertGithubAccount,
} from "./repo.accounts.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    githubAccount: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("github repo.accounts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries user and github account lookups with expected selects", async () => {
    await findUserById(1);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: { id: true } });

    await findGithubAccountByGithubUserId(BigInt(10));
    expect(prisma.githubAccount.findUnique).toHaveBeenCalledWith({
      where: { githubUserId: BigInt(10) },
      select: { userId: true },
    });

    await findGithubAccountByUserId(3);
    expect(prisma.githubAccount.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 3 },
        select: expect.objectContaining({ userId: true, login: true }),
      })
    );

    await findGithubAccountStatusByUserId(4);
    expect(prisma.githubAccount.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 4 },
        select: expect.objectContaining({ login: true, tokenLastRefreshedAt: true }),
      })
    );
  });

  it("deletes account and updates token fields", async () => {
    await deleteGithubAccountByUserId(6);
    expect(prisma.githubAccount.delete).toHaveBeenCalledWith({ where: { userId: 6 } });

    await updateGithubAccountTokens({
      userId: 6,
      accessTokenEncrypted: "a",
      refreshTokenEncrypted: "r",
      tokenType: "Bearer",
      scopes: "repo",
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    });

    expect(prisma.githubAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 6 },
        data: expect.objectContaining({
          accessTokenEncrypted: "a",
          tokenLastRefreshedAt: expect.any(Date),
        }),
      })
    );
  });

  it("upserts github account with create/update token refresh timestamp", async () => {
    await upsertGithubAccount({
      userId: 7,
      githubUserId: BigInt(77),
      login: "alice",
      email: "a@example.com",
      accessTokenEncrypted: "token",
      refreshTokenEncrypted: "refresh",
      tokenType: "Bearer",
      scopes: "repo",
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    });

    expect(prisma.githubAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        create: expect.objectContaining({ githubUserId: BigInt(77), tokenLastRefreshedAt: expect.any(Date) }),
        update: expect.objectContaining({ login: "alice", tokenLastRefreshedAt: expect.any(Date) }),
      })
    );
  });
});
