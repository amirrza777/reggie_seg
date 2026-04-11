import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_BOOTSTRAP_ENV,
  applyEnv,
  argon2Mock,
  auditMock,
  emailMock,
  jwtMock,
  loadService,
  prismaMock,
  setupAuthServiceTestDefaults,
  setupBootstrapCreateLoginContext,
} from "./service.test-helpers.js";

beforeEach(() => {
  setupAuthServiceTestDefaults();
});

afterAll(() => {
  applyEnv();
});

describe("auth service", () => {
  it("signUp always creates a student account even when a privileged role is requested", async () => {
    const svc = await loadService();

    argon2Mock.hash.mockResolvedValueOnce("password-hash").mockResolvedValueOnce("refresh-hash");
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-99" });
    prismaMock.user.create.mockResolvedValueOnce({ id: 4, email: "user@example.com", role: "STUDENT" });

    const tokens = await svc.signUp({
      enterpriseCode: " ent-99 ",
      email: "User@Example.com",
      password: "pw",
      role: "ADMIN" as any,
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: "user@example.com",
        passwordHash: "password-hash",
        firstName: "",
        lastName: "",
        role: "STUDENT",
        enterpriseId: "ent-99",
      },
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 4, hashedToken: "refresh-hash" }),
    });
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("signUp keeps allowed non-admin role", async () => {
    const svc = await loadService();

    argon2Mock.hash.mockResolvedValueOnce("password-hash").mockResolvedValueOnce("refresh-hash");
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2" });
    prismaMock.user.create.mockResolvedValueOnce({ id: 7, email: "staff@example.com", role: "STUDENT" });

    await svc.signUp({
      enterpriseCode: "ENT2",
      email: "staff@example.com",
      password: "pw",
      role: "STAFF",
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "STUDENT" }),
      }),
    );
  });

  it("signUp rejects missing enterprise code, unknown enterprise, and taken email", async () => {
    const svc = await loadService();

    await expect(
      svc.signUp({ enterpriseCode: "   ", email: "a@b.com", password: "pw" }),
    ).rejects.toMatchObject({ code: "ENTERPRISE_CODE_REQUIRED" });

    prismaMock.enterprise.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.signUp({ enterpriseCode: "MISS", email: "a@b.com", password: "pw" }),
    ).rejects.toMatchObject({ code: "ENTERPRISE_NOT_FOUND" });

    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-1" });
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 9 });
    await expect(
      svc.signUp({ enterpriseCode: "ENT", email: "a@b.com", password: "pw" }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("acceptEnterpriseAdminInvite rejects invalid, used, and expired tokens", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-1", newPassword: "pw-1" }),
    ).rejects.toMatchObject({ code: "INVALID_ENTERPRISE_ADMIN_INVITE" });

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 11,
      enterpriseId: "ent-1",
      email: "invitee@example.com",
      revoked: true,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-2", newPassword: "pw-2" }),
    ).rejects.toMatchObject({ code: "USED_ENTERPRISE_ADMIN_INVITE" });

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 12,
      enterpriseId: "ent-1",
      email: "invitee@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-3", newPassword: "pw-3" }),
    ).rejects.toMatchObject({ code: "EXPIRED_ENTERPRISE_ADMIN_INVITE" });
  });

  it("getEnterpriseAdminInviteState reports mode based on existing account presence", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValue({
      id: 18,
      enterpriseId: "ent-1",
      email: "invitee@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    await expect(svc.getEnterpriseAdminInviteState({ token: "token-state-new" })).resolves.toEqual({
      mode: "new_account",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2 });

    await expect(svc.getEnterpriseAdminInviteState({ token: "token-state-existing" })).resolves.toEqual({
      mode: "existing_account",
    });
  });

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

  it("login handles invalid, suspended, and verify-failure credential paths", async () => {
    const svc = await loadService();

    await expect(svc.login({ email: undefined as any, password: "pw" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });

    await expect(svc.login({ email: "missing@x.com", password: "pw" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 1,
      email: "u@x.com",
      role: "STUDENT",
      passwordHash: "h",
      active: false,
    });
    await expect(svc.login({ email: "u@x.com", password: "pw" })).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 1,
      email: "u@x.com",
      role: "STUDENT",
      passwordHash: "h",
      active: true,
    });
    argon2Mock.verify.mockRejectedValueOnce(new Error("bad-hash"));
    await expect(svc.login({ email: "u@x.com", password: "pw" })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("login rejects ambiguous emails found in multiple enterprises", async () => {
    const svc = await loadService();

    prismaMock.user.count.mockResolvedValueOnce(2);

    await expect(svc.login({ email: "shared@x.com", password: "pw" })).rejects.toMatchObject({
      code: "AMBIGUOUS_EMAIL_ACCOUNT",
    });
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it("login issues tokens and writes audit for a regular active user", async () => {
    const svc = await loadService();

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 2,
      email: "normal@x.com",
      role: "STAFF",
      passwordHash: "h",
      active: true,
    });
    argon2Mock.hash.mockResolvedValueOnce("refresh-hash");

    const tokens = await svc.login(
      { email: "normal@x.com", password: "pw" },
      { ip: "1.2.3.4", userAgent: "agent" },
    );

    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
    expect(auditMock.recordAuditLog).toHaveBeenCalledWith({
      userId: 2,
      action: "LOGIN",
      ip: "1.2.3.4",
      userAgent: "agent",
    });
  });

  it("login bootstrap-creates admin user when configured and account does not exist", async () => {
    const svc = await setupBootstrapCreateLoginContext();

    await svc.login({ email: "admin@kcl.ac.uk", password: "bootstrap-secret" });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "admin@kcl.ac.uk",
          role: "ADMIN",
          enterpriseId: "default-enterprise",
        }),
      }),
    );
  });

  it("login bootstrap path returns issued tokens for a newly created admin", async () => {
    const svc = await setupBootstrapCreateLoginContext();
    const tokens = await svc.login({ email: "admin@kcl.ac.uk", password: "bootstrap-secret" });
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("bootstrap login repairs credentials and upgrades role when password check fails", async () => {
    const svc = await loadService({
      ADMIN_BOOTSTRAP_EMAIL: "admin@kcl.ac.uk",
      ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-secret",
    });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 4,
      email: "admin@kcl.ac.uk",
      role: "STAFF",
      passwordHash: "old",
      active: true,
    });
    argon2Mock.verify.mockResolvedValueOnce(false);
    argon2Mock.hash.mockResolvedValueOnce("new-bootstrap-hash").mockResolvedValueOnce("refresh-hash");
    prismaMock.user.update.mockResolvedValueOnce({
      id: 4,
      email: "admin@kcl.ac.uk",
      role: "ADMIN",
      passwordHash: "new-bootstrap-hash",
      active: true,
    });

    await svc.login({ email: "admin@kcl.ac.uk", password: "bootstrap-secret" });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { passwordHash: "new-bootstrap-hash", role: "ADMIN" },
    });
  });

  it("bootstrap login upgrades role when password is valid but role is not ADMIN", async () => {
    const svc = await loadService({
      ADMIN_BOOTSTRAP_EMAIL: "admin@kcl.ac.uk",
      ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-secret",
    });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 5,
      email: "admin@kcl.ac.uk",
      role: "STAFF",
      passwordHash: "ok",
      active: true,
    });
    argon2Mock.verify.mockResolvedValueOnce(true);
    prismaMock.user.update.mockResolvedValueOnce({
      id: 5,
      email: "admin@kcl.ac.uk",
      role: "ADMIN",
      passwordHash: "ok",
      active: true,
    });

    await svc.login({ email: "admin@kcl.ac.uk", password: "anything" });
    expect(prismaMock.user.update).toHaveBeenLastCalledWith({
      where: { id: 5 },
      data: { role: "ADMIN" },
    });
  });

  it("bootstrap login leaves already-admin account unchanged when password is valid", async () => {
    const svc = await loadService({
      ADMIN_BOOTSTRAP_EMAIL: "admin@kcl.ac.uk",
      ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-secret",
    });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 6,
      email: "admin@kcl.ac.uk",
      role: "ADMIN",
      passwordHash: "ok",
      active: true,
    });
    argon2Mock.verify.mockResolvedValueOnce(true);

    await svc.login({ email: "admin@kcl.ac.uk", password: "anything" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("refreshTokens rejects invalid jwt payloads", async () => {
    const svc = await loadService();

    jwtMock.verify.mockImplementationOnce(() => {
      throw new Error("bad");
    });
    await expect(svc.refreshTokens("bad")).rejects.toMatchObject({ code: "INVALID_REFRESH_TOKEN" });
  });

  it("refreshTokens rejects when no stored refresh token matches", async () => {
    const svc = await loadService();

    jwtMock.verify.mockReturnValueOnce({ sub: 7, email: "u@x.com" });
    prismaMock.refreshToken.findMany.mockResolvedValueOnce([]);
    await expect(svc.refreshTokens("token")).rejects.toMatchObject({ code: "INVALID_REFRESH_TOKEN" });
  });

  it("refreshTokens rejects when token maps to a missing user", async () => {
    const svc = await loadService();

    jwtMock.verify.mockReturnValueOnce({ sub: 8, email: "u@x.com" });
    prismaMock.refreshToken.findMany.mockResolvedValueOnce([{ hashedToken: "h" }]);
    argon2Mock.verify.mockResolvedValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.refreshTokens("token")).rejects.toMatchObject({ code: "INVALID_REFRESH_TOKEN" });
  });

  it("refreshTokens rejects suspended users", async () => {
    const svc = await loadService();

    jwtMock.verify.mockReturnValueOnce({ sub: 9, email: "u@x.com" });
    prismaMock.refreshToken.findMany.mockResolvedValueOnce([{ hashedToken: "h" }]);
    argon2Mock.verify.mockResolvedValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 9, email: "u@x.com", role: "STUDENT", active: false });
    await expect(svc.refreshTokens("token")).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });
  });

  it("refreshTokens issues a fresh access/refresh token pair for active users", async () => {
    const svc = await loadService();

    jwtMock.verify.mockReturnValueOnce({ sub: 10, email: "u@x.com" });
    prismaMock.refreshToken.findMany.mockResolvedValueOnce([{ hashedToken: "h" }]);
    argon2Mock.verify.mockResolvedValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 10, email: "u@x.com", role: "STAFF", active: true });

    const tokens = await svc.refreshTokens("token");
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

});
