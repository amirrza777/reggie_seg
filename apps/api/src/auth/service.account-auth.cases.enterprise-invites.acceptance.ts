/* eslint-disable max-lines-per-function, @typescript-eslint/no-explicit-any */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyEnv,
  argon2Mock,
  loadService,
  prismaMock,
  setupAuthServiceTestDefaults,
} from "./service.test-helpers.js";

beforeEach(() => {
  setupAuthServiceTestDefaults();
});

afterAll(() => {
  applyEnv();
});

describe("auth service", () => {
  it("acceptEnterpriseAdminInvite upgrades an existing enterprise user and issues tokens", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 21,
      enterpriseId: "ent-2",
      email: "existing@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 8,
        enterpriseId: "ent-2",
        email: "existing@example.com",
        role: "STUDENT",
        active: false,
      })
      .mockResolvedValueOnce({ id: 8, email: "existing@example.com" });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 8,
      enterpriseId: "ent-2",
      email: "existing@example.com",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });
    const tokens = await svc.acceptEnterpriseAdminInvite({
      token: "token-4",
      newPassword: "invite-pass",
      firstName: "Ada",
      lastName: "Lovelace",
      authenticatedUserId: 8,
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: {
        role: "ENTERPRISE_ADMIN",
        active: true,
      },
    });
    expect(prismaMock.enterpriseAdminInviteToken.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: expect.objectContaining({
        revoked: true,
        acceptedByUserId: 8,
      }),
    });
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("acceptEnterpriseAdminInvite creates a new enterprise admin user when no account exists", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 31,
      enterpriseId: "ent-3",
      email: "new-admin@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockImplementation(async (args: any) => {
      if (args?.where?.enterpriseId_email) {
        return null;
      }
      if (Number(args?.where?.id) === 66) {
        return { id: 66, email: "rehome@example.com" };
      }
      return null;
    });
    argon2Mock.hash.mockResolvedValueOnce("invite-password-hash").mockResolvedValueOnce("refresh-hash");
    prismaMock.user.create.mockResolvedValueOnce({
      id: 44,
      enterpriseId: "ent-3",
      email: "new-admin@example.com",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    const tokens = await svc.acceptEnterpriseAdminInvite({
      token: "token-5",
      newPassword: "new-invite-pass",
      firstName: "New",
      lastName: "Admin",
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        enterpriseId: "ent-3",
        email: "new-admin@example.com",
        firstName: "New",
        lastName: "Admin",
        passwordHash: "invite-password-hash",
        role: "ENTERPRISE_ADMIN",
      }),
    });
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("acceptEnterpriseAdminInvite rehomes a removed holding-account user into invited enterprise", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 32,
      enterpriseId: "ent-3",
      email: "rehome@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findUnique.mockImplementation(async (args: any) => {
      if (args?.where?.enterpriseId_email) {
        return null;
      }
      if (Number(args?.where?.id) === 66) {
        return { id: 66, email: "rehome@example.com" };
      }
      return null;
    });
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 66,
      enterpriseId: "ent-unassigned",
      email: "rehome@example.com",
      role: "STUDENT",
      enterprise: { code: "UNASSIGNED" },
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 66,
      enterpriseId: "ent-3",
      email: "rehome@example.com",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    const tokens = await svc.acceptEnterpriseAdminInvite({
      token: "token-rehome",
      newPassword: "rehome-pass",
      firstName: "Re",
      lastName: "Home",
      authenticatedUserId: 66,
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 66 },
      data: {
        enterpriseId: "ent-3",
        blockedEnterpriseId: null,
        role: "ENTERPRISE_ADMIN",
        active: true,
      },
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("acceptEnterpriseAdminInvite rejects when email already belongs to another enterprise", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 33,
      enterpriseId: "ent-3",
      email: "shared@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockImplementation(async () => null);
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 55,
      enterpriseId: "ent-9",
      email: "shared@example.com",
      role: "STUDENT",
      enterprise: { code: "ENT-9" },
    });

    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-dup", newPassword: "dup-pass" }),
    ).rejects.toMatchObject({ code: "EMAIL_ALREADY_USED_IN_OTHER_ENTERPRISE" });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.enterpriseAdminInviteToken.update).not.toHaveBeenCalled();
  });

  it("acceptEnterpriseAdminInvite requires matching authenticated user for existing accounts", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValue({
      id: 41,
      enterpriseId: "ent-4",
      email: "existing@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockImplementation(async (args: any) => {
      if (args?.where?.enterpriseId_email) {
        return {
          id: 8,
          enterpriseId: "ent-4",
          email: "existing@example.com",
          role: "STUDENT",
          active: true,
        };
      }
      if (args?.where?.id === 99) {
        return { id: 99, email: "other@example.com" };
      }
      return null;
    });

    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-6" }),
    ).rejects.toMatchObject({ code: "AUTH_REQUIRED_FOR_EXISTING_ACCOUNT" });

    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-6", authenticatedUserId: 99 }),
    ).rejects.toMatchObject({ code: "INVITE_EMAIL_MISMATCH" });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("enterprise-admin invite lifecycle resolves state, accepts, then rejects reused token", async () => {
    const svc = await loadService();
    const activeInvite = {
      id: 77,
      enterpriseId: "ent-7",
      email: "journey@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    prismaMock.enterpriseAdminInviteToken.findUnique
      .mockResolvedValueOnce(activeInvite)
      .mockResolvedValueOnce(activeInvite)
      .mockResolvedValueOnce({ ...activeInvite, revoked: true, usedAt: new Date() });

    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    argon2Mock.hash.mockResolvedValueOnce("journey-password-hash").mockResolvedValueOnce("journey-refresh-hash");
    prismaMock.user.create.mockResolvedValueOnce({
      id: 701,
      enterpriseId: "ent-7",
      email: "journey@example.com",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    await expect(svc.getEnterpriseAdminInviteState({ token: "journey-token" })).resolves.toEqual({ mode: "new_account" });

    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "journey-token", newPassword: "journey-pass" }),
    ).resolves.toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });

    await expect(svc.getEnterpriseAdminInviteState({ token: "journey-token" })).rejects.toMatchObject({
      code: "USED_ENTERPRISE_ADMIN_INVITE",
    });
  });
});
