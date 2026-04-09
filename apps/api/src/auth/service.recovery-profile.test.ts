import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyEnv,
  argon2Mock,
  auditMock,
  emailMock,
  jwtMock,
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
  it("logout revokes active refresh tokens and logs audit", async () => {
    const svc = await loadService();

    jwtMock.verify.mockReturnValueOnce({ sub: 11, email: "u@x.com" });
    await svc.logout("refresh", { ip: "2.2.2.2", userAgent: "ua" });

    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 11, revoked: false },
      data: { revoked: true },
    });
    expect(auditMock.recordAuditLog).toHaveBeenCalledWith({
      userId: 11,
      action: "LOGOUT",
      ip: "2.2.2.2",
      userAgent: "ua",
    });
  });

  it("requestPasswordReset is a no-op when user is not found", async () => {
    const svc = await loadService();

    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    await svc.requestPasswordReset("missing@example.com");

    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("requestPasswordReset is a no-op when duplicate emails exist across enterprises", async () => {
    const svc = await loadService();

    prismaMock.user.count.mockResolvedValue(2);
    await svc.requestPasswordReset("shared@example.com");

    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("requestPasswordReset resolves enterprise-local lookup before sending reset", async () => {
    const svc = await loadService();

    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findFirst.mockResolvedValue({ id: 12, email: "user@example.com", firstName: "User" });
    await svc.requestPasswordReset("USER@example.com");

    expect(prismaMock.user.count).toHaveBeenCalledWith({ where: { email: "user@example.com" } });
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({ where: { email: "user@example.com" } });
  });

  it("requestPasswordReset and resetPassword emit debug logs when enabled", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const svc = await loadService({ PASSWORD_RESET_DEBUG: "true" });

    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 30, email: "debug@example.com" });
    await svc.requestPasswordReset("debug@example.com");
    expect(logSpy).toHaveBeenCalled();

    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    await expect(svc.resetPassword({ token: "missing-token", newPassword: "pw" })).rejects.toMatchObject({
      code: "INVALID_RESET_TOKEN",
    });
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it("resetPassword rejects invalid tokens", async () => {
    const svc = await loadService();

    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    await expect(svc.resetPassword({ token: "not-a-hex-token", newPassword: "pw" })).rejects.toMatchObject({
      code: "INVALID_RESET_TOKEN",
    });
  });

  it("resetPassword rejects used tokens", async () => {
    const svc = await loadService();

    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      id: 1,
      userId: 2,
      revoked: true,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      svc.resetPassword({ token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", newPassword: "pw" }),
    ).rejects.toMatchObject({ code: "USED_RESET_TOKEN" });
  });

  it("resetPassword rejects expired tokens", async () => {
    const svc = await loadService();

    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      id: 1,
      userId: 2,
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(svc.resetPassword({ token: "abc", newPassword: "pw" })).rejects.toMatchObject({
      code: "EXPIRED_RESET_TOKEN",
    });
  });

  it("resetPassword updates credentials and revokes existing sessions", async () => {
    const svc = await loadService();

    argon2Mock.hash.mockResolvedValueOnce("new-password-hash");
    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      id: 9,
      userId: 42,
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
    });
    prismaMock.user.update.mockResolvedValueOnce({ id: 42 });
    prismaMock.passwordResetToken.update.mockResolvedValueOnce({ id: 9 });
    prismaMock.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 3 });
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 5 });

    await svc.resetPassword({ token: "https://site/reset?token=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", newPassword: "pw" });

    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("getProfile throws when user does not exist", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getProfile(1)).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("getProfile maps avatar bytes to base64", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      avatarData: Buffer.from("avatar-bytes"),
      avatarMime: null,
    });

    await expect(svc.getProfile(1)).resolves.toEqual({
      id: 1,
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      avatarBase64: Buffer.from("avatar-bytes").toString("base64"),
      avatarMime: null,
    });
  });

  it("getProfile preserves null avatarBase64 when no avatar data is stored", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 2,
      email: "c@d.com",
      firstName: "C",
      lastName: "D",
      avatarData: null,
      avatarMime: "image/png",
    });
    await expect(svc.getProfile(2)).resolves.toEqual({
      id: 2,
      email: "c@d.com",
      firstName: "C",
      lastName: "D",
      avatarBase64: null,
      avatarMime: "image/png",
    });
  });

  it("updateProfile removes avatar when avatarBase64 is null", async () => {
    const svc = await loadService();

    prismaMock.user.update.mockResolvedValueOnce({
      id: 1,
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      avatarData: null,
      avatarMime: null,
    });

    await svc.updateProfile({ userId: 1, avatarBase64: null, firstName: "A" });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { firstName: "A", avatarData: null, avatarMime: null },
    });
  });

  it("updateProfile stores avatar bytes and mime type", async () => {
    const svc = await loadService();

    prismaMock.user.update.mockResolvedValueOnce({
      id: 1,
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      avatarData: Buffer.from("img"),
      avatarMime: "image/png",
    });

    const result = await svc.updateProfile({
      userId: 1,
      lastName: "C",
      avatarBase64: Buffer.from("img").toString("base64"),
      avatarMime: "image/png",
    });

    expect(prismaMock.user.update).toHaveBeenLastCalledWith({
      where: { id: 1 },
      data: {
        lastName: "C",
        avatarData: Buffer.from("img"),
        avatarMime: "image/png",
      },
    });
    expect(result.avatarBase64).toBe(Buffer.from("img").toString("base64"));
  });

  it("updateProfile keeps null mime when avatarMime is omitted", async () => {
    const svc = await loadService();

    prismaMock.user.update.mockResolvedValueOnce({
      id: 1,
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      avatarData: Buffer.from("img"),
      avatarMime: null,
    });
    await svc.updateProfile({
      userId: 1,
      avatarBase64: Buffer.from("img").toString("base64"),
    });
    expect(prismaMock.user.update).toHaveBeenLastCalledWith({
      where: { id: 1 },
      data: {
        avatarData: Buffer.from("img"),
        avatarMime: null,
      },
    });
  });

  it("requestEmailChange handles user missing, email taken, and success", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.requestEmailChange({ userId: 1, newEmail: "next@x.com" })).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({ enterpriseId: "ent-1" });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2 });
    await expect(svc.requestEmailChange({ userId: 1, newEmail: "next@x.com" })).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({ enterpriseId: "ent-1" });
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await svc.requestEmailChange({ userId: 1, newEmail: "Next@X.com" });

    expect(prismaMock.emailChangeToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 1, newEmail: "next@x.com", codeHash: expect.any(String), expiresAt: expect.any(Date) }),
    });
    expect(emailMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "next@x.com", subject: "Verify your new email", text: expect.stringContaining("verification code"), html: expect.stringContaining("<strong") }),
    );
  });

  it("confirmEmailChange maps invalid code and success transaction", async () => {
    const svc = await loadService();

    prismaMock.emailChangeToken.findFirst.mockResolvedValueOnce(null);
    await expect(
      svc.confirmEmailChange({ userId: 1, newEmail: "next@x.com", code: "1234" }),
    ).rejects.toMatchObject({ code: "INVALID_EMAIL_CODE" });

    prismaMock.emailChangeToken.findFirst.mockResolvedValueOnce({ id: 5 });
    prismaMock.user.update.mockResolvedValueOnce({ id: 1 });
    prismaMock.emailChangeToken.updateMany.mockResolvedValueOnce({ count: 2 });
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 4 });

    await svc.confirmEmailChange({ userId: 1, newEmail: "NEXT@X.COM", code: " 1234 " });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("joinEnterpriseByCode rejects missing code and non-unassigned users", async () => {
    const svc = await loadService();

    await expect(svc.joinEnterpriseByCode({ userId: 1, enterpriseCode: "   " })).rejects.toMatchObject({
      code: "ENTERPRISE_CODE_REQUIRED",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "user@example.com",
      role: "STUDENT",
      active: true,
      enterprise: { code: "DEFAULT" },
    });
    await expect(svc.joinEnterpriseByCode({ userId: 1, enterpriseCode: "ENT2" })).rejects.toMatchObject({
      code: "ENTERPRISE_JOIN_NOT_ALLOWED",
    });
  });

  it("joinEnterpriseByCode returns blocked when the enterprise has a suspended account for the email", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 7,
        email: "user@example.com",
        role: "STUDENT",
        active: true,
        blockedEnterpriseId: null,
        enterprise: { code: "UNASSIGNED" },
      })
      .mockResolvedValueOnce({
        id: 88,
        active: false,
      });
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2", name: "Enterprise Two" });

    await expect(svc.joinEnterpriseByCode({ userId: 7, enterpriseCode: "ENT2" })).rejects.toMatchObject({
      code: "ENTERPRISE_ACCESS_BLOCKED",
    });
  });

  it("joinEnterpriseByCode returns blocked when enterprise admin previously removed the account", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 7,
      email: "user@example.com",
      role: "STUDENT",
      active: true,
      blockedEnterpriseId: "ent-2",
      enterprise: { code: "UNASSIGNED" },
    });
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2", name: "Enterprise Two" });

    await expect(svc.joinEnterpriseByCode({ userId: 7, enterpriseCode: "ENT2" })).rejects.toMatchObject({
      code: "ENTERPRISE_ACCESS_BLOCKED",
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("joinEnterpriseByCode moves unassigned users into the target enterprise", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 7,
        email: "user@example.com",
        role: "STUDENT",
        active: true,
        blockedEnterpriseId: null,
        enterprise: { code: "UNASSIGNED" },
      })
      .mockResolvedValueOnce(null);
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2", name: "Enterprise Two" });

    const result = await svc.joinEnterpriseByCode({ userId: 7, enterpriseCode: "ENT2" });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        enterpriseId: "ent-2",
        blockedEnterpriseId: null,
        role: "STUDENT",
        active: true,
      },
    });
    expect(result).toEqual({
      enterpriseId: "ent-2",
      enterpriseName: "Enterprise Two",
    });
  });

  it("joinEnterpriseByCode preserves the blocked enterprise marker for previously removed users", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 7,
        email: "user@example.com",
        role: "STUDENT",
        active: true,
        blockedEnterpriseId: "ent-1",
        enterprise: { code: "UNASSIGNED" },
      })
      .mockResolvedValueOnce(null);
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2", name: "Enterprise Two" });

    await svc.joinEnterpriseByCode({ userId: 7, enterpriseCode: "ENT2" });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        enterpriseId: "ent-2",
        blockedEnterpriseId: "ent-1",
        role: "STUDENT",
        active: true,
      },
    });
  });

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
