import { afterEach, describe, expect, it, vi } from "vitest";

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("seed entrypoint marker-account logging", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("logs each seeded marker account entry", async () => {
    const prismaMock = { $disconnect: vi.fn().mockResolvedValue(undefined) };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.doMock("argon2", () => ({ default: { hash: vi.fn(async () => "hash") } }));
    vi.doMock("../../../../prisma/seed/config", () => ({
      SEED_CONFIG: { fixtureJoinCodes: false, deterministicFixtures: false, scenarios: new Set<string>() },
      SEED_PROFILE: "dev",
      SEED_USER_PASSWORD: "password123",
    }));
    vi.doMock("../../../../prisma/seed/core", () => ({
      assertPrismaClientModels: vi.fn(),
      getSeedEnterprises: vi.fn(async () => [{ id: "ent-1", code: "DEFAULT", name: "Default Enterprise" }]),
    }));
    vi.doMock("../../../../prisma/seed/help", () => ({ seedHelpContent: vi.fn(async () => undefined) }));
    vi.doMock("../../../../prisma/seed/plan", () => ({
      buildSeedContext: vi.fn(async () => ({})),
      buildSeedStepPlan: vi.fn(() => []),
    }));
    vi.doMock("../../../../prisma/seed/prismaClient", () => ({ prisma: prismaMock }));
    vi.doMock("../../../../prisma/seed/data", () => ({
      seedMarkerUserData: [{ email: "marker@example.com", role: "STAFF" }],
    }));

    await import("../../../../prisma/seed/seed");
    await flushAsyncWork();

    expect(logSpy).toHaveBeenCalledWith("- marker@example.com (STAFF)");
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });
});
