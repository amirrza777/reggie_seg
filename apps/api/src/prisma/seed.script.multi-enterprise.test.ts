import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPrismaMock, flushAsyncWork, mockSeedRuntime } from "./seed.script.shared";

describe("prisma seed script multi-enterprise", registerMultiEnterpriseTests);

function registerMultiEnterpriseTests() {
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
    const prismaMock = arrangeMultiEnterpriseRuntime();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await import("../../prisma/seed/seed.ts");
    await flushAsyncWork();
    expectMultiEnterpriseArtifacts(prismaMock, logSpy);
  });
}

function arrangeMultiEnterpriseRuntime() {
  const prismaMock = buildPrismaMock();
  prismaMock.enterprise.findUnique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
  prismaMock.enterprise.create = vi.fn().mockResolvedValueOnce({ id: "ent-1" }).mockResolvedValueOnce({ id: "ent-2" });
  mockSeedRuntime(prismaMock, { enterpriseCount: 2 });
  return prismaMock;
}

function expectMultiEnterpriseArtifacts(prismaMock: ReturnType<typeof buildPrismaMock>, _logSpy: ReturnType<typeof vi.spyOn>) {
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
  expect(prismaMock.featureFlag.upsert).toHaveBeenCalled();
}
