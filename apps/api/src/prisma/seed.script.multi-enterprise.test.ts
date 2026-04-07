import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPrismaMock, flushAsyncWork, mockSeedRuntime } from "./seed.script.shared";

describe("prisma seed script multi-enterprise", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SEED_COMPLETED_PROJECT_SCENARIO = "false";
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = "12345678901234567890123456789012";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("repeats the seed flow for each configured enterprise", async () => {
    const prismaMock = buildPrismaMock();
    prismaMock.enterprise.findUnique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prismaMock.enterprise.create = vi.fn().mockResolvedValueOnce({ id: "ent-1" }).mockResolvedValueOnce({ id: "ent-2" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mockSeedRuntime(prismaMock, { enterpriseCount: 2 });

    await import("../../prisma/seed/seed.ts");
    await flushAsyncWork();

    expect(prismaMock.enterprise.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.createMany).toHaveBeenCalled();
    expect(prismaMock.module.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            briefText: expect.any(String),
            timelineText: expect.any(String),
            expectationsText: expect.any(String),
            readinessNotesText: expect.any(String),
          }),
        ]),
      }),
    );
    expect(prismaMock.meetingComment.create).toHaveBeenCalled();
    expect(prismaMock.mention.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ sourceType: "COMMENT" })]),
      }),
    );
    expect(prismaMock.featureFlag.upsert).toHaveBeenCalledTimes(6);
    expect(logSpy.mock.calls.some(([msg]) => String(msg).includes("Seed users ready across 2 enterprise(s). Default password"))).toBe(
      true,
    );
  });
});
