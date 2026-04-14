/* eslint-disable max-lines-per-function */
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
} from "../service.test-helpers.js";

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

  it("requestPasswordReset sends reset-specific copy with real newlines", async () => {
    const svc = await loadService({ FRONTEND_URL: "https://app.example.com" });

    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findFirst.mockResolvedValue({ id: 12, email: "user@example.com", firstName: "User" });
    await svc.requestPasswordReset("user@example.com");

    expect(emailMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Reset your password",
        text: expect.stringContaining("We received a request to reset your Team Feedback password."),
      }),
    );

    const sent = emailMock.sendEmail.mock.calls[0][0];
    expect(sent.text).toContain("https://app.example.com/reset-password?token=");
    expect(sent.text).not.toContain("\\n");
  });

  it("sendPasswordSetupEmail sends setup-specific copy", async () => {
    const svc = await loadService({
      FRONTEND_URL: "https://app.example.com",
      PASSWORD_SETUP_TTL: "7d",
    });

    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findFirst.mockResolvedValue({ id: 13, email: "new@example.com", firstName: "New" });
    await svc.sendPasswordSetupEmail("new@example.com");

    expect(emailMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@example.com",
        subject: "Set up your password",
        text: expect.stringContaining("An account has been created for you in Team Feedback."),
      }),
    );

    const sent = emailMock.sendEmail.mock.calls[0][0];
    expect(sent.text).toContain("https://app.example.com/reset-password?token=");
    expect(sent.text).not.toContain("We received a request to reset");
    expect(sent.text).toContain("expires in 7d");
  });

  it("requestPasswordReset continues using PASSWORD_RESET_TTL independently", async () => {
    const svc = await loadService({
      FRONTEND_URL: "https://app.example.com",
      PASSWORD_RESET_TTL: "45m",
      PASSWORD_SETUP_TTL: "7d",
    });

    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findFirst.mockResolvedValue({ id: 12, email: "user@example.com", firstName: "User" });
    await svc.requestPasswordReset("user@example.com");

    const sent = emailMock.sendEmail.mock.calls[0][0];
    expect(sent.text).toContain("expires in 45m");
    expect(sent.text).not.toContain("expires in 7d");
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
});
