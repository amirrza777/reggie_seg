import { beforeEach, describe, expect, it, vi } from "vitest";
import { isFeatureEnabled } from "./service.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    enterprise: {
      upsert: vi.fn(),
    },
    featureFlag: {
      findUnique: vi.fn(),
    },
  },
}));

describe("featureFlags service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses provided enterpriseId without upserting default enterprise", async () => {
    (prisma.featureFlag.findUnique as any).mockResolvedValue({ enabled: true });

    const enabled = await isFeatureEnabled("newDashboard", "ent-1");

    expect(prisma.enterprise.upsert).not.toHaveBeenCalled();
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({
      where: { enterpriseId_key: { enterpriseId: "ent-1", key: "newDashboard" } },
      select: { enabled: true },
    });
    expect(enabled).toBe(true);
  });

  it("upserts default enterprise when enterpriseId is omitted", async () => {
    (prisma.enterprise.upsert as any).mockResolvedValue({ id: "default-ent" });
    (prisma.featureFlag.findUnique as any).mockResolvedValue({ enabled: false });

    const enabled = await isFeatureEnabled("betaFeature");

    expect(prisma.enterprise.upsert).toHaveBeenCalledWith({
      where: { code: "DEFAULT" },
      update: {},
      create: { code: "DEFAULT", name: "Default Enterprise" },
      select: { id: true },
    });
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({
      where: { enterpriseId_key: { enterpriseId: "default-ent", key: "betaFeature" } },
      select: { enabled: true },
    });
    expect(enabled).toBe(false);
  });

  it("returns false when flag record does not exist", async () => {
    (prisma.enterprise.upsert as any).mockResolvedValue({ id: "default-ent" });
    (prisma.featureFlag.findUnique as any).mockResolvedValue(null);

    await expect(isFeatureEnabled("missingFlag")).resolves.toBe(false);
  });
});
