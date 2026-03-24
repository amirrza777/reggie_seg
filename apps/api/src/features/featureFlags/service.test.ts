import { beforeEach, describe, expect, it, vi } from "vitest";
import { isFeatureEnabled, isFeatureEnabledForUser, listFeatureFlagsForUser } from "./service.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    featureFlag: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("featureFlags service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks a flag by enterprise id", async () => {
    (prisma.featureFlag.createMany as any).mockResolvedValue({ count: 0 });
    (prisma.featureFlag.findUnique as any).mockResolvedValue({ enabled: true });

    const enabled = await isFeatureEnabled("newDashboard", "ent-1");

    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({
      where: { enterpriseId_key: { enterpriseId: "ent-1", key: "newDashboard" } },
      select: { enabled: true },
    });
    expect(enabled).toBe(true);
  });

  it("checks a flag by user enterprise", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ enterpriseId: "ent-2", active: true });
    (prisma.featureFlag.createMany as any).mockResolvedValue({ count: 0 });
    (prisma.featureFlag.findUnique as any).mockResolvedValue({ enabled: false });

    const enabled = await isFeatureEnabledForUser("betaFeature", 12);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 12 },
      select: { enterpriseId: true, active: true },
    });
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({
      where: { enterpriseId_key: { enterpriseId: "ent-2", key: "betaFeature" } },
      select: { enabled: true },
    });
    expect(enabled).toBe(false);
  });

  it("returns false when user is missing or inactive", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(isFeatureEnabledForUser("missingFlag", 99)).resolves.toBe(false);

    (prisma.user.findUnique as any).mockResolvedValue({ enterpriseId: "ent-3", active: false });
    await expect(isFeatureEnabledForUser("missingFlag", 99)).resolves.toBe(false);
    expect(prisma.featureFlag.findUnique).not.toHaveBeenCalled();
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

  it("returns false when flag record does not exist", async () => {
    (prisma.featureFlag.createMany as any).mockResolvedValue({ count: 0 });
    (prisma.featureFlag.findUnique as any).mockResolvedValue(null);

    await expect(isFeatureEnabled("missingFlag", "ent-1")).resolves.toBe(false);
  });
});
