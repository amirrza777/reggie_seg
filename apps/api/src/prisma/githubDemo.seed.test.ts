import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { __githubDemoInternals, seedGithubDemoPath } from "../../prisma/seed/githubDemo";

describe("seedGithubDemoPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when no project exists in context", async () => {
    const result = await seedGithubDemoPath({
      enterprise: { id: "ent-1" },
      projects: [],
    } as any);

    expect(result).toBeUndefined();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("skips when GitHub demo users are missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);

    const result = await seedGithubDemoPath({
      enterprise: { id: "ent-1" },
      projects: [{ id: 11 }],
    } as any);

    expect(result).toBeUndefined();
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2);
  });

  it("accepts base64 and rejects invalid encryption-key lengths", () => {
    const original = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    expect(__githubDemoInternals.getSeedGithubTokenEncryptionKey()).toHaveLength(32);

    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    expect(__githubDemoInternals.getSeedGithubTokenEncryptionKey()).toHaveLength(32);

    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = "short";
    expect(() => __githubDemoInternals.getSeedGithubTokenEncryptionKey()).toThrow(
      "GITHUB_TOKEN_ENCRYPTION_KEY must decode to 32 bytes for GitHub demo seeding",
    );

    if (original === undefined) delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    else process.env.GITHUB_TOKEN_ENCRYPTION_KEY = original;
  });
});
