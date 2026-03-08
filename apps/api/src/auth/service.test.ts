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
  it("signUp creates a student user with enterprise resolution and issues tokens", async () => {
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
    prismaMock.user.create.mockResolvedValueOnce({ id: 7, email: "staff@example.com", role: "STAFF" });

    await svc.signUp({
      enterpriseCode: "ENT2",
      email: "staff@example.com",
      password: "pw",
      role: "STAFF",
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "STAFF" }),
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
    const svc = await loadService({
      ADMIN_BOOTSTRAP_EMAIL: "admin@kcl.ac.uk",
      ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-secret",
    });

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.enterprise.upsert.mockResolvedValueOnce({ id: "default-enterprise" });
    argon2Mock.hash
      .mockResolvedValueOnce("bootstrap-password-hash")
      .mockResolvedValueOnce("refresh-hash");
    prismaMock.user.create.mockResolvedValueOnce({
      id: 3,
      email: "admin@kcl.ac.uk",
      role: "ADMIN",
      passwordHash: "bootstrap-password-hash",
      active: true,
    });

    const tokens = await svc.login({ email: "admin@kcl.ac.uk", password: "bootstrap-secret" });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: "admin@kcl.ac.uk",
        passwordHash: "bootstrap-password-hash",
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        enterpriseId: "default-enterprise",
      },
    });
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("login bootstrap path repairs credentials and upgrades role when needed", async () => {
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

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 6,
      email: "admin@kcl.ac.uk",
      role: "ADMIN",
      passwordHash: "ok",
      active: true,
    });
    argon2Mock.verify.mockResolvedValueOnce(true);

    await svc.login({ email: "admin@kcl.ac.uk", password: "anything" });
    expect(prismaMock.user.update).toHaveBeenCalledTimes(2);
  });

  it("refreshTokens maps invalid token, missing user, suspended user and success", async () => {
    const svc = await loadService();

    jwtMock.verify.mockImplementationOnce(() => {
      throw new Error("bad");
    });
    await expect(svc.refreshTokens("bad")).rejects.toMatchObject({ code: "INVALID_REFRESH_TOKEN" });

    jwtMock.verify.mockReturnValueOnce({ sub: 7, email: "u@x.com" });
    prismaMock.refreshToken.findMany.mockResolvedValueOnce([]);
    await expect(svc.refreshTokens("token")).rejects.toMatchObject({ code: "INVALID_REFRESH_TOKEN" });

    jwtMock.verify.mockReturnValueOnce({ sub: 8, email: "u@x.com" });
    prismaMock.refreshToken.findMany.mockResolvedValueOnce([{ hashedToken: "h" }]);
    argon2Mock.verify.mockResolvedValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.refreshTokens("token")).rejects.toMatchObject({ code: "INVALID_REFRESH_TOKEN" });

    jwtMock.verify.mockReturnValueOnce({ sub: 9, email: "u@x.com" });
    prismaMock.refreshToken.findMany.mockResolvedValueOnce([{ hashedToken: "h" }]);
    argon2Mock.verify.mockResolvedValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 9, email: "u@x.com", role: "STUDENT", active: false });
    await expect(svc.refreshTokens("token")).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });

    jwtMock.verify.mockReturnValueOnce({ sub: 10, email: "u@x.com" });
    prismaMock.refreshToken.findMany.mockResolvedValueOnce([{ hashedToken: "h" }]);
    argon2Mock.verify.mockResolvedValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 10, email: "u@x.com", role: "STAFF", active: true });

    const tokens = await svc.refreshTokens("token");
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

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

  it("resetPassword maps invalid, used, expired and success branches", async () => {
    const svc = await loadService();

    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    await expect(svc.resetPassword({ token: "not-a-hex-token", newPassword: "pw" })).rejects.toMatchObject({
      code: "INVALID_RESET_TOKEN",
    });

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

  it("getProfile returns profile with avatar mapping and throws for missing user", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getProfile(1)).rejects.toMatchObject({ code: "USER_NOT_FOUND" });

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

  it("updateProfile handles avatar removal and avatar replacement", async () => {
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

  it("signUpWithProvider returns existing user or creates a new provider user", async () => {
    const svc = await loadService();

    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 91, email: "provider@x.com", role: "STUDENT" });
    await expect(
      svc.signUpWithProvider({ email: "provider@x.com", provider: "google" }),
    ).resolves.toMatchObject({ id: 91 });

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.enterprise.upsert.mockResolvedValueOnce({ id: "default-ent" });
    argon2Mock.hash.mockResolvedValueOnce("provider-password-hash");
    prismaMock.user.create.mockResolvedValueOnce({ id: 92, email: "new@x.com", role: "STUDENT" });

    await expect(
      svc.signUpWithProvider({ email: "new@x.com", firstName: "N", lastName: "U", provider: "google" }),
    ).resolves.toMatchObject({ id: 92 });

    expect(prismaMock.user.create).toHaveBeenLastCalledWith({
      data: {
        email: "new@x.com",
        passwordHash: "provider-password-hash",
        firstName: "N",
        lastName: "U",
        role: "STUDENT",
        enterpriseId: "default-ent",
      },
    });

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.enterprise.upsert.mockResolvedValueOnce({ id: "default-ent" });
    argon2Mock.hash.mockResolvedValueOnce("provider-password-hash-2");
    prismaMock.user.create.mockResolvedValueOnce({ id: 93, email: "fallback@x.com", role: "STUDENT" });

    await svc.signUpWithProvider({ email: "fallback@x.com", provider: "google" });
    expect(prismaMock.user.create).toHaveBeenLastCalledWith({
      data: {
        email: "fallback@x.com",
        passwordHash: "provider-password-hash-2",
        firstName: "",
        lastName: "",
        role: "STUDENT",
        enterpriseId: "default-ent",
      },
    });
  });

  it("issueTokensForUser maps missing user and lowercases email", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.issueTokensForUser(1, "X@Y.COM")).rejects.toMatchObject({ code: "INVALID_REFRESH_TOKEN" });

    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1, role: "ADMIN" });
    const tokens = await svc.issueTokensForUser(1, "X@Y.COM");

    expect(jwtMock.sign).toHaveBeenCalledWith(
      expect.objectContaining({ email: "x@y.com", admin: true }),
      expect.any(String),
      expect.any(Object),
    );
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("verifyRefreshToken delegates to jwt.verify", async () => {
    const svc = await loadService();

    jwtMock.verify.mockReturnValueOnce({ sub: 22, email: "x@y.com", admin: true });
    expect(svc.verifyRefreshToken("rt")).toEqual({ sub: 22, email: "x@y.com", admin: true });
  });

  it("parses refresh TTL values for seconds and numeric fallback", async () => {
    const svcSeconds = await loadService({ JWT_REFRESH_TTL: "5s" });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1, role: "STUDENT" });
    await svcSeconds.issueTokensForUser(1, "a@b.com");

    const expiresAtSeconds = prismaMock.refreshToken.create.mock.calls[0][0].data.expiresAt as Date;
    expect(expiresAtSeconds.getTime()).toBeGreaterThan(Date.now());

    const svcNumeric = await loadService({ JWT_REFRESH_TTL: "7" });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1, role: "STUDENT" });
    await svcNumeric.issueTokensForUser(1, "a@b.com");

    const expiresAtNumeric = prismaMock.refreshToken.create.mock.calls[1][0].data.expiresAt as Date;
    expect(expiresAtNumeric.getTime()).toBeGreaterThan(Date.now());
  });
});
