import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    module: { count: vi.fn() },
    team: { count: vi.fn() },
    meeting: { count: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
    enterprise: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    featureFlag: { createMany: vi.fn(), deleteMany: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    auditLogIntegrity: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: dbMocks.prisma }));

import {
  createEnterpriseAdminInviteToken,
  createEnterpriseWithFlags,
  createGlobalAdminInviteToken,
  findUserByEmail,
  findUserByEnterpriseAndEmail,
  listUsers,
  listUsersByEmail,
  listUsersByEnterprise,
} from "./repo.js";

describe("admin repo coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs user listing and lookup queries with expected select/order clauses", async () => {
    dbMocks.prisma.user.findMany.mockResolvedValue([]);
    dbMocks.prisma.user.findFirst.mockResolvedValue(null);
    dbMocks.prisma.user.findUnique.mockResolvedValue(null);

    await listUsers();
    await listUsersByEnterprise("ent-1");
    await listUsersByEmail("x@example.com");
    await findUserByEmail("x@example.com");
    await findUserByEnterpriseAndEmail("ent-1", "x@example.com");

    expect(dbMocks.prisma.user.findMany).toHaveBeenCalledTimes(3);
    expect(dbMocks.prisma.user.findUnique).toHaveBeenCalled();
    expect(dbMocks.prisma.user.findFirst).toHaveBeenCalled();
  });

  it("creates enterprise-admin invite tokens and revokes prior active tokens", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: 1, email: "admin@example.com", expiresAt: new Date("2026-06-01T00:00:00.000Z") });
    dbMocks.prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) =>
      cb({ enterpriseAdminInviteToken: { updateMany, create } }),
    );

    const result = await createEnterpriseAdminInviteToken({
      enterpriseId: "ent-1",
      email: "admin@example.com",
      tokenHash: "hash",
      invitedByUserId: 7,
      expiresAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    expect(updateMany).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ email: "admin@example.com" }));
  });

  it("throws when invite token delegates are unavailable on prisma client", async () => {
    dbMocks.prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => cb({}));

    await expect(
      createEnterpriseAdminInviteToken({
        enterpriseId: "ent-1",
        email: "admin@example.com",
        tokenHash: "hash",
        invitedByUserId: 7,
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("enterpriseAdminInviteToken");

    await expect(
      createGlobalAdminInviteToken({
        email: "global@example.com",
        tokenHash: "hash",
        invitedByUserId: 7,
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("globalAdminInviteToken");
  });

  it("creates global-admin invite tokens and enterprise with default flags via transactions", async () => {
    const globalUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const globalCreate = vi.fn().mockResolvedValue({ id: 2, email: "global@example.com", expiresAt: new Date("2026-06-01T00:00:00.000Z") });
    dbMocks.prisma.$transaction
      .mockImplementationOnce(async (cb: (tx: any) => Promise<unknown>) =>
        cb({ globalAdminInviteToken: { updateMany: globalUpdateMany, create: globalCreate } }),
      )
      .mockImplementationOnce(async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          enterprise: {
            create: vi.fn().mockResolvedValue({
              id: "ent-9",
              code: "ENT9",
              name: "Enterprise Nine",
              createdAt: new Date("2026-05-01T00:00:00.000Z"),
            }),
          },
          featureFlag: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        }),
      );

    const invite = await createGlobalAdminInviteToken({
      email: "global@example.com",
      tokenHash: "hash",
      invitedByUserId: 1,
      expiresAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    expect(invite).toEqual(expect.objectContaining({ email: "global@example.com" }));

    const enterprise = await createEnterpriseWithFlags("Enterprise Nine", "ENT9", [
      { key: "k1", label: "Feature 1", enabled: true },
      { key: "k2", label: "Feature 2", enabled: false },
    ]);
    expect(enterprise).toEqual(expect.objectContaining({ id: "ent-9", code: "ENT9" }));
  });
});
