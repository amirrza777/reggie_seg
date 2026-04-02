import { afterEach, describe, expect, it, vi } from "vitest";

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("seed entrypoint failure handling", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("logs errors, disconnects prisma, and sets exitCode on failure", async () => {
    const prismaMock = { $disconnect: vi.fn().mockResolvedValue(undefined) };
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.doMock("argon2", () => ({
      default: { hash: vi.fn(async () => "hash") },
    }));
    vi.doMock("../../prisma/seed/config", () => ({
      SEED_CONFIG: { fixtureJoinCodes: false, deterministicFixtures: false, scenarios: new Set<string>() },
      SEED_PROFILE: "dev",
      SEED_USER_PASSWORD: "password123",
    }));
    vi.doMock("../../prisma/seed/core", () => ({
      assertPrismaClientModels: vi.fn(),
      getSeedEnterprises: vi.fn(async () => [{ id: "ent-1", code: "DEFAULT", name: "Default Enterprise" }]),
    }));
    vi.doMock("../../prisma/seed/help", () => ({
      seedHelpContent: vi.fn(async () => {
        throw new Error("seed failed");
      }),
    }));
    vi.doMock("../../prisma/seed/plan", () => ({
      buildSeedContext: vi.fn(),
      buildSeedStepPlan: vi.fn(() => []),
    }));
    vi.doMock("../../prisma/seed/prismaClient", () => ({
      prisma: prismaMock,
    }));
    vi.doMock("../../prisma/seed/data", () => ({
      seedMarkerUserData: [],
    }));

    process.exitCode = undefined;
    await import("../../prisma/seed/seed");
    await flushAsyncWork();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(prismaMock.$disconnect).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("logs config summary with scenarios=none when scenario set is empty", async () => {
    const prismaMock = { $disconnect: vi.fn().mockResolvedValue(undefined) };
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.doMock("argon2", () => ({
      default: { hash: vi.fn(async () => "hash") },
    }));
    vi.doMock("../../prisma/seed/config", () => ({
      SEED_CONFIG: { fixtureJoinCodes: false, deterministicFixtures: false, scenarios: new Set<string>() },
      SEED_PROFILE: "dev",
      SEED_USER_PASSWORD: "password123",
    }));
    vi.doMock("../../prisma/seed/core", () => ({
      assertPrismaClientModels: vi.fn(),
      getSeedEnterprises: vi.fn(async () => [{ id: "ent-1", code: "DEFAULT", name: "Default Enterprise" }]),
    }));
    vi.doMock("../../prisma/seed/help", () => ({
      seedHelpContent: vi.fn(async () => undefined),
    }));
    vi.doMock("../../prisma/seed/plan", () => ({
      buildSeedContext: vi.fn(async () => ({})),
      buildSeedStepPlan: vi.fn(() => []),
    }));
    vi.doMock("../../prisma/seed/prismaClient", () => ({
      prisma: prismaMock,
    }));
    vi.doMock("../../prisma/seed/data", () => ({
      seedMarkerUserData: [],
    }));

    process.exitCode = undefined;
    await import("../../prisma/seed/seed");
    await flushAsyncWork();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("scenarios=none"));
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });
});
