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
