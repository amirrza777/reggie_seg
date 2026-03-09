import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hashMock: vi.fn(async (value: string) => `hashed:${value}`),
  verifyArgonMock: vi.fn(async () => true),
  jwtSignMock: vi.fn(() => "signed-token"),
  jwtVerifyMock: vi.fn(),
  recordAuditLogMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("argon2", () => ({
  default: { hash: mocks.hashMock, verify: mocks.verifyArgonMock },
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: mocks.jwtSignMock, verify: mocks.jwtVerifyMock },
}));

vi.mock("../features/audit/service.js", () => ({ recordAuditLog: mocks.recordAuditLogMock }));
vi.mock("../shared/email.js", () => ({ sendEmail: mocks.sendEmailMock }));

vi.mock("../shared/db.js", () => ({
  prisma: {
    enterprise: { upsert: vi.fn().mockResolvedValue({ id: "ent-1" }) },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
  },
}));

import { prisma } from "../shared/db.js";
import {
  signUp,
  login,
  refreshTokens,
  requestPasswordReset,
  getProfile,
  requestEmailChange,
  confirmEmailChange,
  verifyRefreshToken,
} from "./service.js";

describe("auth service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.enterprise.upsert as any).mockResolvedValue({ id: "ent-1" });
  });

  it("signUp throws EMAIL_TAKEN when user already exists", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 1 });

    await expect(signUp({ email: "u@test.com", password: "pw" })).rejects.toEqual({ code: "EMAIL_TAKEN" });
  });

  it("signUp creates user and persists refresh token", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 7, email: "u@test.com", role: "STUDENT" });
    (prisma.refreshToken.create as any).mockResolvedValue({ id: 1 });

    const tokens = await signUp({ email: "u@test.com", password: "pw", firstName: "A", lastName: "B" });

    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    expect(tokens).toEqual({ accessToken: "signed-token", refreshToken: "signed-token" });
  });

  it("login returns INVALID_CREDENTIALS when user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await expect(login({ email: "u@test.com", password: "pw" })).rejects.toEqual({ code: "INVALID_CREDENTIALS" });
  });

  it("refreshTokens maps verify failures to INVALID_REFRESH_TOKEN", async () => {
    mocks.jwtVerifyMock.mockImplementation(() => {
      throw new Error("bad token");
    });

    await expect(refreshTokens("bad")).rejects.toEqual({ code: "INVALID_REFRESH_TOKEN" });
  });

  it("requestPasswordReset exits silently when user is missing", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await requestPasswordReset("missing@test.com");

    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mocks.sendEmailMock).not.toHaveBeenCalled();
  });

  it("getProfile maps avatar buffer to base64", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 2,
      email: "u@test.com",
      firstName: "A",
      lastName: "B",
      avatarData: Buffer.from("hello"),
      avatarMime: "image/png",
    });

    await expect(getProfile(2)).resolves.toEqual({
      id: 2,
      email: "u@test.com",
      firstName: "A",
      lastName: "B",
      avatarBase64: Buffer.from("hello").toString("base64"),
      avatarMime: "image/png",
    });
  });

  it("requestEmailChange throws EMAIL_TAKEN when next email exists", async () => {
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce({ enterpriseId: "ent-1" })
      .mockResolvedValueOnce({ id: 3 });

    await expect(requestEmailChange({ userId: 3, newEmail: "taken@test.com" })).rejects.toEqual({ code: "EMAIL_TAKEN" });
  });

  it("confirmEmailChange throws INVALID_EMAIL_CODE when no matching token", async () => {
    (prisma.emailChangeToken.findFirst as any).mockResolvedValue(null);

    await expect(confirmEmailChange({ userId: 1, newEmail: "x@test.com", code: "1234" })).rejects.toEqual({
      code: "INVALID_EMAIL_CODE",
    });
  });

  it("verifyRefreshToken proxies jwt.verify", () => {
    mocks.jwtVerifyMock.mockReturnValue({ sub: 10, email: "u@test.com" });

    expect(verifyRefreshToken("ok")).toEqual({ sub: 10, email: "u@test.com" });
    expect(mocks.jwtVerifyMock).toHaveBeenCalledWith("ok", expect.any(String));
  });

  it("login records audit log for successful login", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 5,
      email: "u@test.com",
      passwordHash: "hashed:pw",
      role: "STUDENT",
      active: true,
    });
    mocks.verifyArgonMock.mockResolvedValueOnce(true);
    (prisma.refreshToken.create as any).mockResolvedValue({ id: 1 });

    await login({ email: "u@test.com", password: "pw" }, { ip: "127.0.0.1" });

    expect(mocks.recordAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 5, action: "LOGIN" }));
  });
});
