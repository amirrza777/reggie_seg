/* eslint-disable max-lines-per-function */
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
  it("acceptGlobalAdminInvite rejects invalid, used, and expired tokens", async () => {
    const svc = await loadService();

    prismaMock.globalAdminInviteToken.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.acceptGlobalAdminInvite({ token: "global-token-1", newPassword: "pw-1" }),
    ).rejects.toMatchObject({ code: "INVALID_GLOBAL_ADMIN_INVITE" });

    prismaMock.globalAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 11,
      email: "invitee@example.com",
      revoked: true,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      svc.acceptGlobalAdminInvite({ token: "global-token-2", newPassword: "pw-2" }),
    ).rejects.toMatchObject({ code: "USED_GLOBAL_ADMIN_INVITE" });

    prismaMock.globalAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 12,
      email: "invitee@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(
      svc.acceptGlobalAdminInvite({ token: "global-token-3", newPassword: "pw-3" }),
    ).rejects.toMatchObject({ code: "EXPIRED_GLOBAL_ADMIN_INVITE" });
  });

  it("getGlobalAdminInviteState reports mode based on existing account presence", async () => {
    const svc = await loadService();

    prismaMock.globalAdminInviteToken.findUnique.mockResolvedValue({
      id: 18,
      email: "invitee@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.count.mockReset();
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.count.mockResolvedValueOnce(0);
    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    await expect(svc.getGlobalAdminInviteState({ token: "global-token-state-new" })).resolves.toEqual({
      mode: "new_account",
    });

    prismaMock.user.count.mockResolvedValueOnce(1);
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 2,
      email: "invitee@example.com",
      enterprise: { code: "UNASSIGNED" },
    });
    await expect(svc.getGlobalAdminInviteState({ token: "global-token-state-existing" })).resolves.toEqual({
      mode: "existing_account",
    });
  });

  it("getGlobalAdminInviteState rejects when invite email belongs to a non-holding enterprise account", async () => {
    const svc = await loadService();

    prismaMock.globalAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 19,
      email: "enterprise-user@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.count.mockResolvedValueOnce(1);
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 201,
      email: "enterprise-user@example.com",
      enterprise: { code: "ENT-9" },
    });

    await expect(svc.getGlobalAdminInviteState({ token: "global-token-state-blocked" })).rejects.toMatchObject({
      code: "EMAIL_ALREADY_USED_IN_ENTERPRISE_ACCOUNT",
    });
  });

  it("acceptGlobalAdminInvite upgrades an existing user account and issues tokens", async () => {
    const svc = await loadService();

    prismaMock.globalAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 21,
      email: "existing@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.count.mockResolvedValueOnce(1);
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 8,
      email: "existing@example.com",
      enterprise: { code: "UNASSIGNED" },
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 8, email: "existing@example.com" });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 8,
      email: "existing@example.com",
      role: "ADMIN",
      active: true,
    });

    const tokens = await svc.acceptGlobalAdminInvite({
      token: "global-token-4",
      authenticatedUserId: 8,
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: {
        role: "ADMIN",
        active: true,
      },
    });
    expect(prismaMock.globalAdminInviteToken.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: expect.objectContaining({
        revoked: true,
        acceptedByUserId: 8,
      }),
    });
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("acceptGlobalAdminInvite rejects when invite email is now bound to an enterprise account", async () => {
    const svc = await loadService();

    prismaMock.globalAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 22,
      email: "moved@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.count.mockResolvedValueOnce(1);
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 81,
      email: "moved@example.com",
      enterprise: { code: "ENT-2" },
    });

    await expect(
      svc.acceptGlobalAdminInvite({
        token: "global-token-4b",
        authenticatedUserId: 81,
      }),
    ).rejects.toMatchObject({ code: "EMAIL_ALREADY_USED_IN_ENTERPRISE_ACCOUNT" });

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("acceptGlobalAdminInvite creates a new global admin user when no account exists", async () => {
    const svc = await loadService();

    prismaMock.globalAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 31,
      email: "new-global-admin@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.count.mockResolvedValueOnce(0);
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.enterprise.upsert.mockResolvedValueOnce({ id: "ent-unassigned" });
    argon2Mock.hash.mockResolvedValueOnce("invite-password-hash").mockResolvedValueOnce("refresh-hash");
    prismaMock.user.create.mockResolvedValueOnce({
      id: 44,
      enterpriseId: "ent-unassigned",
      email: "new-global-admin@example.com",
      role: "ADMIN",
      active: true,
    });

    const tokens = await svc.acceptGlobalAdminInvite({
      token: "global-token-5",
      newPassword: "new-invite-pass",
      firstName: "New",
      lastName: "Admin",
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        enterpriseId: "ent-unassigned",
        email: "new-global-admin@example.com",
        firstName: "New",
        lastName: "Admin",
        passwordHash: "invite-password-hash",
        role: "ADMIN",
      }),
    });
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("global-admin invite lifecycle resolves existing state, accepts, then rejects reused token", async () => {
    const svc = await loadService();
    const activeInvite = {
      id: 88,
      email: "global-journey@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    prismaMock.globalAdminInviteToken.findUnique
      .mockResolvedValueOnce(activeInvite)
      .mockResolvedValueOnce(activeInvite)
      .mockResolvedValueOnce({ ...activeInvite, revoked: true, usedAt: new Date() });

    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findFirst.mockResolvedValue({
      id: 902,
      email: "global-journey@example.com",
      enterprise: { code: "UNASSIGNED" },
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 902,
      email: "global-journey@example.com",
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 902,
      email: "global-journey@example.com",
      role: "ADMIN",
      active: true,
    });

    await expect(svc.getGlobalAdminInviteState({ token: "global-journey-token" })).resolves.toEqual({
      mode: "existing_account",
    });

    await expect(
      svc.acceptGlobalAdminInvite({ token: "global-journey-token", authenticatedUserId: 902 }),
    ).resolves.toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });

    await expect(svc.getGlobalAdminInviteState({ token: "global-journey-token" })).rejects.toMatchObject({
      code: "USED_GLOBAL_ADMIN_INVITE",
    });
  });
});
