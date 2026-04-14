import { beforeEach, describe, expect, it, vi } from "vitest";
import { listFeatureFlagsForUser } from "./service.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    featureFlag: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("featureFlags service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists flags for user enterprise", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ enterpriseId: "ent-2", active: true });
    (prisma.featureFlag.createMany as any).mockResolvedValue({ count: 0 });
    (prisma.featureFlag.findMany as any).mockResolvedValue([{ key: "repos", enabled: true }]);

    const flags = await listFeatureFlagsForUser(12);
    expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-2" },
      orderBy: { key: "asc" },
    });
    expect(flags).toEqual([{ key: "repos", enabled: true }]);
  });

  it("returns null when listing flags for missing or inactive user", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    await expect(listFeatureFlagsForUser(12)).resolves.toBeNull();

    (prisma.user.findUnique as any).mockResolvedValueOnce({ enterpriseId: "ent-2", active: false });
    await expect(listFeatureFlagsForUser(12)).resolves.toBeNull();

    expect(prisma.featureFlag.createMany).not.toHaveBeenCalled();
    expect(prisma.featureFlag.findMany).not.toHaveBeenCalled();
  });
});
