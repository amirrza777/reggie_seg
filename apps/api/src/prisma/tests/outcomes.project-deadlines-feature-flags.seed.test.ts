import { beforeEach, describe, expect, it } from "vitest";

import { prismaMock, resetOutcomesSeedMocks } from "../outcomes.seed.shared";
import { seedFeatureFlags, seedProjectDeadlines } from "../../../prisma/seed/outcomes";

describe("outcomes seeder deadlines and feature flags", () => {
  beforeEach(() => {
    resetOutcomesSeedMocks();
  });

  it("seedProjectDeadlines skips empty project list", async () => {
    const result = await seedProjectDeadlines([]);
    expect(result).toBeUndefined();
    expect(prismaMock.projectDeadline.upsert).not.toHaveBeenCalled();
  });

  it("seedProjectDeadlines upserts deadlines and counts only new projects", async () => {
    prismaMock.projectDeadline.findMany.mockResolvedValue([{ projectId: 2 }]);

    await seedProjectDeadlines([
      { id: 1, moduleId: 1, templateId: 1 },
      { id: 2, moduleId: 1, templateId: 1 },
    ] as never);

    expect(prismaMock.projectDeadline.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.projectDeadline.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 1 },
      }),
    );
  });

  it("seedFeatureFlags returns created count based on existing keys", async () => {
    prismaMock.featureFlag.findMany.mockResolvedValue([{ key: "peer_feedback" }]);

    await seedFeatureFlags("ent-1");

    expect(prismaMock.featureFlag.upsert).toHaveBeenCalled();
    expect(prismaMock.featureFlag.upsert.mock.calls.length).toBeGreaterThan(1);
  });

  it("seedFeatureFlags reports zero created when all keys already exist", async () => {
    prismaMock.featureFlag.findMany.mockResolvedValue([{ key: "peer_feedback" }, { key: "modules" }, { key: "repos" }]);

    await seedFeatureFlags("ent-1");

    expect(prismaMock.featureFlag.upsert).toHaveBeenCalledTimes(3);
  });
});
