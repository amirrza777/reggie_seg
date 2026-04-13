/* eslint-disable max-lines-per-function */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyEnv,
  argon2Mock,
  auditMock,
  jwtMock,
  loadService,
  prismaMock,
  setupAuthServiceTestDefaults,
  setupBootstrapCreateLoginContext,
} from "../service.test-helpers.js";

beforeEach(() => {
  setupAuthServiceTestDefaults();
});

afterAll(() => {
  applyEnv();
});

describe("auth service", () => {
  it("login handles invalid, suspended, and verify-failure credential paths", async () => {
    const svc = await loadService();

    await expect(svc.login({ email: undefined as unknown as string, password: "pw" })).rejects.toMatchObject({
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
