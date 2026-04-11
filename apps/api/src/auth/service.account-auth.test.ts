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
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 8,
      enterpriseId: "ent-2",
      email: "existing@example.com",
      role: "STUDENT",
      active: false,
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 8,
      enterpriseId: "ent-2",
      email: "existing@example.com",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });
    argon2Mock.hash.mockResolvedValueOnce("invite-password-hash").mockResolvedValueOnce("refresh-hash");

    const tokens = await svc.acceptEnterpriseAdminInvite({
      token: "token-4",
      newPassword: "invite-pass",
      firstName: "Ada",
      lastName: "Lovelace",
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: {
        role: "ENTERPRISE_ADMIN",
        active: true,
        passwordHash: "invite-password-hash",
        firstName: "Ada",
        lastName: "Lovelace",
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
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
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
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
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
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 66 },
      data: {
        enterpriseId: "ent-3",
        blockedEnterpriseId: null,
        role: "ENTERPRISE_ADMIN",
        active: true,
        passwordHash: "hashed",
        firstName: "Re",
        lastName: "Home",
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
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 55,
      enterpriseId: "ent-9",
      email: "shared@example.com",
      role: "STUDENT",
    });

    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-dup", newPassword: "dup-pass" }),
    ).rejects.toMatchObject({ code: "EMAIL_ALREADY_USED_IN_OTHER_ENTERPRISE" });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.enterpriseAdminInviteToken.update).not.toHaveBeenCalled();
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
