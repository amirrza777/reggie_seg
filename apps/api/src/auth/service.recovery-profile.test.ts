import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const argon2Mock = {
  hash: vi.fn(),
  verify: vi.fn(),
};

const jwtMock = {
  sign: vi.fn(),
  verify: vi.fn(),
};

const prismaMock = {
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  enterprise: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  passwordResetToken: {
    updateMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  emailChangeToken: {
    updateMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
};

const auditMock = {
  recordAuditLog: vi.fn(),
};

const emailMock = {
  sendEmail: vi.fn(),
};

vi.mock("argon2", () => ({ default: argon2Mock }));
vi.mock("jsonwebtoken", () => ({ default: jwtMock }));
vi.mock("../shared/db.js", () => ({ prisma: prismaMock }));
vi.mock("../features/audit/service.js", () => ({ recordAuditLog: auditMock.recordAuditLog }));
vi.mock("../shared/email.js", () => ({ sendEmail: emailMock.sendEmail }));

const ENV_KEYS = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_TTL",
  "JWT_REFRESH_TTL",
  "PASSWORD_RESET_TTL",
  "APP_BASE_URL",
  "PASSWORD_RESET_DEBUG",
  "EMAIL_CHANGE_TTL",
  "ADMIN_BOOTSTRAP_EMAIL",
  "ADMIN_BOOTSTRAP_PASSWORD",
] as const;

const originalEnv: Record<string, string | undefined> = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function applyEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}) {
  for (const key of ENV_KEYS) {
    const value = key in overrides ? overrides[key] : originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function loadService(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}) {
  applyEnv(overrides);
  vi.resetModules();
  return import("./service.js");
}

beforeEach(() => {
  vi.clearAllMocks();
  applyEnv();

  let signCounter = 0;
  jwtMock.sign.mockImplementation(() => `signed-${++signCounter}`);
  jwtMock.verify.mockReturnValue({ sub: 1, email: "user@example.com" });

  argon2Mock.hash.mockResolvedValue("hashed");
  argon2Mock.verify.mockResolvedValue(true);

  prismaMock.$transaction.mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(prismaMock);
  });

  prismaMock.refreshToken.create.mockResolvedValue({ id: 1 });
  prismaMock.refreshToken.findMany.mockResolvedValue([]);
  prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockResolvedValue({ id: 1, email: "user@example.com", role: "STUDENT" });
  prismaMock.user.update.mockResolvedValue({ id: 1, email: "user@example.com", role: "STUDENT" });

  prismaMock.enterprise.findUnique.mockResolvedValue({ id: "ent-1" });
  prismaMock.enterprise.upsert.mockResolvedValue({ id: "default-ent" });

  prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.passwordResetToken.create.mockResolvedValue({ id: 1 });
  prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
  prismaMock.passwordResetToken.update.mockResolvedValue({ id: 1 });

  prismaMock.emailChangeToken.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.emailChangeToken.create.mockResolvedValue({ id: 1 });
  prismaMock.emailChangeToken.findFirst.mockResolvedValue(null);

  auditMock.recordAuditLog.mockResolvedValue(undefined);
  emailMock.sendEmail.mockResolvedValue(undefined);
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

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    await svc.requestPasswordReset("missing@example.com");

    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("requestPasswordReset creates a token and sends email", async () => {
    const svc = await loadService();

    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 12, email: "user@example.com" });
    await svc.requestPasswordReset("USER@example.com");

    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalled();
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 12, tokenHash: expect.any(String), expiresAt: expect.any(Date) }),
    });
    expect(emailMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com", subject: "Reset your password", text: expect.stringContaining("Reset your password:") }),
    );
  });

  it("requestPasswordReset and resetPassword emit debug logs when enabled", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const svc = await loadService({ PASSWORD_RESET_DEBUG: "true" });

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

});
