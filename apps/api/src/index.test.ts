import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();
const enterpriseFindUniqueMock = vi.fn();
const userFindFirstMock = vi.fn();
const userCreateMock = vi.fn();
const startNotificationJobMock = vi.fn();
const startAuditRetentionJobMock = vi.fn();
const dotenvConfigMock = vi.fn();
const argonHashMock = vi.fn();
const listenMock = vi.fn((_port: number, _host: string, cb?: () => void) => {
  cb?.();
});

vi.mock("./app.js", () => ({
  app: {
    listen: listenMock,
  },
}));

vi.mock("./shared/db.js", () => ({
  prisma: {
    enterprise: {
      upsert: upsertMock,
      findUnique: enterpriseFindUniqueMock,
    },
    user: {
      findFirst: userFindFirstMock,
      create: userCreateMock,
    },
  },
}));

vi.mock("./shared/notificationJob.js", () => ({
  startNotificationJob: startNotificationJobMock,
}));

vi.mock("./features/audit/retentionJob.js", () => ({
  startAuditRetentionJob: startAuditRetentionJobMock,
}));

vi.mock("dotenv", () => ({
  default: {
    config: dotenvConfigMock,
  },
}));

vi.mock("argon2", () => ({
  hash: argonHashMock,
}));

describe("index.ts", () => {
  const ORIGINAL_ENV = process.env;
  const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const processExitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    upsertMock.mockResolvedValue({});
    enterpriseFindUniqueMock.mockResolvedValue({ id: 99 });
    userFindFirstMock.mockResolvedValue(null);
    userCreateMock.mockResolvedValue({});
    argonHashMock.mockResolvedValue("hashed-password");
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("loads dotenv on module import", async () => {
    await import("./index.ts");
    expect(dotenvConfigMock).toHaveBeenCalledTimes(1);
  });

  it("resolveServerAddress uses env host/port and defaults when invalid", async () => {
    process.env.PORT = "4321";
    process.env.HOST = "127.0.0.2";
    const modA = await import("./index.ts");
    expect(modA.resolveServerAddress()).toEqual({ host: "127.0.0.2", port: 4321 });

    vi.resetModules();
    process.env.PORT = "not-a-number";
    delete process.env.HOST;
    const modB = await import("./index.ts");
    expect(modB.resolveServerAddress()).toEqual({ host: "0.0.0.0", port: 3000 });
  });

  it("shouldAutoStart and maybeStartServer respect test-runtime gating", async () => {
    const { shouldAutoStart, maybeStartServer } = await import("./index.ts");

    expect(shouldAutoStart(true)).toBe(false);
    expect(shouldAutoStart(false)).toBe(true);

    await maybeStartServer(true);
    expect(listenMock).not.toHaveBeenCalled();

    await maybeStartServer(false);
    expect(listenMock).toHaveBeenCalledTimes(1);
  });

  it("default runtime detection can autostart when NODE_ENV=production", async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "production" };

    const { shouldAutoStart, maybeStartServer } = await import("./index.ts");
    expect(shouldAutoStart()).toBe(true);

    await maybeStartServer();
    expect(listenMock).toHaveBeenCalledTimes(2);
  });

  it("bootstrap upserts enterprise and skips admin creation when bootstrap env is missing", async () => {
    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const { bootstrap } = await import("./index.ts");

    await bootstrap();

    expect(upsertMock).toHaveBeenNthCalledWith(1, {
      where: { code: "DEFAULT" },
      update: {},
      create: { code: "DEFAULT", name: "Default Enterprise" },
    });
    expect(enterpriseFindUniqueMock).not.toHaveBeenCalled();
    expect(userFindFirstMock).not.toHaveBeenCalled();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it("bootstrap creates admin with lowercase email when enterprise exists and no existing user", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = "ADMIN@EXAMPLE.COM";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "secret";
    const { bootstrap } = await import("./index.ts");

    await bootstrap();

    expect(enterpriseFindUniqueMock).toHaveBeenCalledWith({ where: { code: "DEFAULT" }, select: { id: true } });
    expect(userFindFirstMock).toHaveBeenCalledWith({ where: { email: "admin@example.com" } });
    expect(argonHashMock).toHaveBeenCalledWith("secret");
    expect(userCreateMock).toHaveBeenCalledWith({
      data: {
        email: "admin@example.com",
        passwordHash: "hashed-password",
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        enterpriseId: 99,
      },
    });
    expect(consoleLogSpy).toHaveBeenCalledWith("Admin user created: admin@example.com");
  });

  it("bootstrap skips admin create when enterprise lookup returns null", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@example.com";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "secret";
    enterpriseFindUniqueMock.mockResolvedValue(null);
    const { bootstrap } = await import("./index.ts");

    await bootstrap();

    expect(userFindFirstMock).not.toHaveBeenCalled();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it("bootstrap skips admin create when user already exists", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@example.com";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "secret";
    userFindFirstMock.mockResolvedValue({ id: 5 });
    const { bootstrap } = await import("./index.ts");

    await bootstrap();

    expect(userCreateMock).not.toHaveBeenCalled();
    expect(argonHashMock).not.toHaveBeenCalled();
  });

  it("startServer listens and starts jobs after successful bootstrap", async () => {
    process.env.PORT = "4010";
    process.env.HOST = "127.0.0.1";
    const { startServer } = await import("./index.ts");

    await startServer();

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith(4010, "127.0.0.1", expect.any(Function));
    expect(startNotificationJobMock).toHaveBeenCalledTimes(1);
    expect(startAuditRetentionJobMock).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith("API listening on http://127.0.0.1:4010");
  });

  it("startServer logs and exits when bootstrap fails", async () => {
    upsertMock.mockRejectedValueOnce(new Error("db down"));
    const { startServer } = await import("./index.ts");

    await startServer();

    expect(consoleErrorSpy).toHaveBeenCalledWith("Bootstrap failed:", expect.any(Error));
    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(listenMock).not.toHaveBeenCalled();
  });

  it("bootstrap creates the default enterprise in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
    vi.resetModules();
    const { bootstrap } = await import("./index.ts");

    await bootstrap();

    expect(upsertMock).toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalledWith({
      where: { code: "DEFAULT" },
      update: {},
      create: { code: "DEFAULT", name: "Default Enterprise" },
    });
  });
});
