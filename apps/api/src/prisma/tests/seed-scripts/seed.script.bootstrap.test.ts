import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPrismaMock, flushAsyncWork, mockSeedRuntime } from "../../seed.script.shared";

describe("prisma seed script bootstrap admin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SEED_COMPLETED_PROJECT_SCENARIO = "false";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("skips bootstrap admin creation when admin env is missing", async () => {
    const prismaMock = buildPrismaMock();
    prismaMock.user.findUnique = vi.fn().mockResolvedValue({ id: 999 });
    mockSeedRuntime(prismaMock);

    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;

    await import("../../../../prisma/seed/seed.ts");
    await flushAsyncWork();

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });
});
