/* eslint-disable max-lines-per-function */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyEnv,
  argon2Mock,
  loadService,
  prismaMock,
  setupAuthServiceTestDefaults,
} from "../service.test-helpers.js";

beforeEach(() => {
  setupAuthServiceTestDefaults();
});

afterAll(() => {
  applyEnv();
});

describe("auth service", () => {
  it("leaveEnterprise moves users into unassigned holding enterprise", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 25,
      email: "user@example.com",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-1",
      enterprise: { code: "ENT1" },
    });
    prismaMock.enterprise.upsert.mockResolvedValueOnce({ id: "ent-removed" });

    const result = await svc.leaveEnterprise({ userId: 25 });

    expect(prismaMock.moduleLead.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 25,
        module: { enterpriseId: "ent-1" },
      },
    });
    expect(prismaMock.moduleTeachingAssistant.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 25,
        module: { enterpriseId: "ent-1" },
      },
    });
    expect(prismaMock.userModule.deleteMany).toHaveBeenCalledWith({
      where: {
        enterpriseId: "ent-1",
        userId: 25,
      },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 25 },
      data: {
        enterpriseId: "ent-removed",
        blockedEnterpriseId: "ent-1",
        role: "STUDENT",
        active: true,
      },
    });
    expect(result).toEqual({ enterpriseId: "ent-removed" });
  });

  it("leaveEnterprise rejects forbidden accounts and already-unassigned users", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 2,
      email: "admin@kcl.ac.uk",
      role: "ADMIN",
      active: true,
      enterpriseId: "ent-1",
      enterprise: { code: "ENT1" },
    });
    await expect(svc.leaveEnterprise({ userId: 2 })).rejects.toMatchObject({
      code: "ACCOUNT_LEAVE_FORBIDDEN",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 4,
      email: "enterprise-admin@example.com",
      role: "ENTERPRISE_ADMIN",
      active: true,
      enterpriseId: "ent-1",
      enterprise: { code: "ENT1" },
    });
    await expect(svc.leaveEnterprise({ userId: 4 })).rejects.toMatchObject({
      code: "ACCOUNT_LEAVE_FORBIDDEN",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 3,
      email: "student@example.com",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-removed",
      enterprise: { code: "UNASSIGNED" },
    });
    await expect(svc.leaveEnterprise({ userId: 3 })).rejects.toMatchObject({
      code: "ALREADY_UNASSIGNED",
    });
  });

  it("deleteAccount rejects unknown users", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.deleteAccount({ userId: 12, password: "secret" })).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  it("deleteAccount rejects invalid passwords", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 12,
      email: "user@example.com",
      passwordHash: "stored-hash",
      role: "STUDENT",
      enterpriseId: "ent-1",
    });
    argon2Mock.verify.mockResolvedValueOnce(false);

    await expect(svc.deleteAccount({ userId: 12, password: "wrong" })).rejects.toMatchObject({
      code: "INVALID_PASSWORD",
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("deleteAccount revokes access and anonymizes the account", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 25,
      email: "user@example.com",
      passwordHash: "stored-hash",
      role: "STUDENT",
      enterpriseId: "ent-1",
    });
    prismaMock.enterprise.upsert.mockResolvedValueOnce({ id: "ent-removed" });
    argon2Mock.verify.mockResolvedValueOnce(true);
    argon2Mock.hash.mockResolvedValueOnce("deleted-password-hash");

    await svc.deleteAccount({ userId: 25, password: "secret" });

    expect(prismaMock.moduleLead.deleteMany).toHaveBeenCalledWith({
      where: { userId: 25, module: { enterpriseId: "ent-1" } },
    });
    expect(prismaMock.moduleTeachingAssistant.deleteMany).toHaveBeenCalledWith({
      where: { userId: 25, module: { enterpriseId: "ent-1" } },
    });
    expect(prismaMock.userModule.deleteMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1", userId: 25 },
    });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 25, revoked: false },
      data: { revoked: true },
    });
    expect(prismaMock.githubAccount.deleteMany).toHaveBeenCalledWith({
      where: { userId: 25 },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 25 },
        data: expect.objectContaining({
          enterpriseId: "ent-removed",
          firstName: "Deleted",
          lastName: "Account",
          role: "STUDENT",
          active: false,
          email: expect.stringMatching(/^deleted\+25\.\d+@account\.invalid$/),
        }),
      }),
    );
  });

  it("deleteAccount forbids deleting platform admin accounts", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 2,
      email: "admin@kcl.ac.uk",
      passwordHash: "stored-hash",
      role: "ADMIN",
      enterpriseId: "ent-1",
    });

    await expect(svc.deleteAccount({ userId: 2, password: "secret" })).rejects.toMatchObject({
      code: "ACCOUNT_DELETE_FORBIDDEN",
    });
  });
});
