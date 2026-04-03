import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { seedGithubDemoPath } from "../../prisma/seed/githubDemo";

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
});
