import { vi } from "vitest";

export const argon2Mock = {
  hash: vi.fn(),
  verify: vi.fn(),
};

export const jwtMock = {
  sign: vi.fn(),
  verify: vi.fn(),
};

export const prismaMock = {
  user: {
    findFirst: vi.fn(),
    count: vi.fn(),
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
  enterpriseAdminInviteToken: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  moduleLead: {
    deleteMany: vi.fn(),
  },
  moduleTeachingAssistant: {
    deleteMany: vi.fn(),
  },
  userModule: {
    deleteMany: vi.fn(),
  },
  githubAccount: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

export const auditMock = {
  recordAuditLog: vi.fn(),
};

export const emailMock = {
  sendEmail: vi.fn(),
};

vi.mock("argon2", () => ({ default: argon2Mock }));
vi.mock("jsonwebtoken", () => ({ default: jwtMock }));
vi.mock("../shared/db.js", () => ({ prisma: prismaMock }));
vi.mock("../features/audit/service.js", () => ({ recordAuditLog: auditMock.recordAuditLog }));
vi.mock("../shared/email.js", () => ({ sendEmail: emailMock.sendEmail }));

export const ENV_KEYS = [
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
  "SUPER_ADMIN_EMAIL",
  "REMOVED_USERS_ENTERPRISE_CODE",
  "REMOVED_USERS_ENTERPRISE_NAME",
] as const;

type EnvKey = (typeof ENV_KEYS)[number];
type EnvOverrides = Partial<Record<EnvKey, string | undefined>>;

const originalEnv: Record<string, string | undefined> = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

export function applyEnv(overrides: EnvOverrides = {}) {
  for (const key of ENV_KEYS) {
    const value = key in overrides ? overrides[key] : originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

export async function loadService(overrides: EnvOverrides = {}) {
  applyEnv(overrides);
  vi.resetModules();
  return import("./service.js");
}

export const ADMIN_BOOTSTRAP_ENV = {
  ADMIN_BOOTSTRAP_EMAIL: "admin@kcl.ac.uk",
  ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-secret",
} as const;

const createdBootstrapAdmin = {
  id: 3,
  email: "admin@kcl.ac.uk",
  role: "ADMIN",
  passwordHash: "bootstrap-password-hash",
  active: true,
};

export async function setupBootstrapCreateLoginContext() {
  const svc = await loadService(ADMIN_BOOTSTRAP_ENV);
  prismaMock.user.findFirst.mockResolvedValueOnce(null);
  prismaMock.enterprise.upsert.mockResolvedValueOnce({ id: "default-enterprise" });
  argon2Mock.hash.mockResolvedValueOnce("bootstrap-password-hash").mockResolvedValueOnce("refresh-hash");
  prismaMock.user.create.mockResolvedValueOnce(createdBootstrapAdmin);
  return svc;
}

export function setupAuthServiceTestDefaults() {
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
  prismaMock.user.count.mockResolvedValue(1);
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

  prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValue(null);
  prismaMock.enterpriseAdminInviteToken.update.mockResolvedValue({ id: 1 });
  prismaMock.enterpriseAdminInviteToken.updateMany.mockResolvedValue({ count: 1 });

  prismaMock.moduleLead.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.moduleTeachingAssistant.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.userModule.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.githubAccount.deleteMany.mockResolvedValue({ count: 0 });

  auditMock.recordAuditLog.mockResolvedValue(undefined);
  emailMock.sendEmail.mockResolvedValue(undefined);
}
