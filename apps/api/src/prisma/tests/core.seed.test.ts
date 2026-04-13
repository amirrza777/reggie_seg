import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaState, configState } = vi.hoisted(() => ({
  prismaState: {
    prisma: {
      project: {},
      enterprise: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    } as Record<string, any>,
  },
  configState: {
    ADMIN_BOOTSTRAP_EMAIL: undefined as string | undefined,
    ADMIN_BOOTSTRAP_PASSWORD: undefined as string | undefined,
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaState.prisma,
}));

vi.mock("../../../prisma/seed/config", () => ({
  get ADMIN_BOOTSTRAP_EMAIL() {
    return configState.ADMIN_BOOTSTRAP_EMAIL;
  },
  get ADMIN_BOOTSTRAP_PASSWORD() {
    return configState.ADMIN_BOOTSTRAP_PASSWORD;
  },
}));

vi.mock("argon2", () => ({
  default: {
    hash: vi.fn(async (value: string) => `hashed-${value}`),
  },
}));

import { assertPrismaClientModels, getSeedEnterprises, seedAdminUser } from "../../../prisma/seed/core";

describe("seed core", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaState.prisma.project = {};
    prismaState.prisma.module = {};
    configState.ADMIN_BOOTSTRAP_EMAIL = undefined;
    configState.ADMIN_BOOTSTRAP_PASSWORD = undefined;
    prismaState.prisma.enterprise.findUnique.mockResolvedValue(null);
    prismaState.prisma.enterprise.create.mockResolvedValue({ id: "ent-1" });
    prismaState.prisma.user.findUnique.mockResolvedValue(null);
    prismaState.prisma.user.create.mockResolvedValue({ id: 1 });
  });

  it("assertPrismaClientModels throws when project delegate is missing", () => {
    delete prismaState.prisma.module;
    delete prismaState.prisma.project;
    expect(() => assertPrismaClientModels()).toThrow("Prisma Client is out of date");
  });

  it("getSeedEnterprises creates missing enterprise", async () => {
    const result = await getSeedEnterprises();
    expect(result).toEqual([{ id: "ent-1", code: "DEFAULT", name: "Default Enterprise" }]);
    expect(prismaState.prisma.enterprise.create).toHaveBeenCalled();
  });

  it("getSeedEnterprises reuses existing enterprise", async () => {
    prismaState.prisma.enterprise.findUnique.mockResolvedValue({ id: "existing-ent" });
    const result = await getSeedEnterprises();
    expect(result).toEqual([{ id: "existing-ent", code: "DEFAULT", name: "Default Enterprise" }]);
    expect(prismaState.prisma.enterprise.create).not.toHaveBeenCalled();
  });

  it("seedAdminUser skips when bootstrap env is not configured", async () => {
    await expect(seedAdminUser("ent-1")).resolves.toBeUndefined();
    expect(prismaState.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("seedAdminUser skips when admin already exists", async () => {
    configState.ADMIN_BOOTSTRAP_EMAIL = "admin@example.com";
    configState.ADMIN_BOOTSTRAP_PASSWORD = "secret";
    prismaState.prisma.user.findUnique.mockResolvedValue({ id: 10 });

    await seedAdminUser("ent-1");
    expect(prismaState.prisma.user.create).not.toHaveBeenCalled();
  });

  it("seedAdminUser creates admin when not present", async () => {
    configState.ADMIN_BOOTSTRAP_EMAIL = "admin@example.com";
    configState.ADMIN_BOOTSTRAP_PASSWORD = "secret";
    prismaState.prisma.user.findUnique.mockResolvedValue(null);

    await seedAdminUser("ent-1");
    expect(prismaState.prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "admin@example.com",
        passwordHash: "hashed-secret",
        role: "ADMIN",
        enterpriseId: "ent-1",
      }),
    });
  });
});
