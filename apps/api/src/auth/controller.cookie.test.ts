import { afterEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

const serviceMocks = {
  signUp: vi.fn(),
  getEnterpriseAdminInviteState: vi.fn(),
  getGlobalAdminInviteState: vi.fn(),
  acceptEnterpriseAdminInvite: vi.fn(),
  acceptGlobalAdminInvite: vi.fn(),
  login: vi.fn(),
  refreshTokens: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  requestEmailChange: vi.fn(),
  confirmEmailChange: vi.fn(),
  deleteAccount: vi.fn(),
  validateRefreshTokenSession: vi.fn(),
  verifyRefreshToken: vi.fn(),
};

vi.mock("./service.js", () => serviceMocks);
vi.mock("../shared/db.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
  },
}));

function mockResponse() {
  const res: Partial<Response> & { cookie: ReturnType<typeof vi.fn> } = {
    status: vi.fn(),
    json: vi.fn(),
    cookie: vi.fn(),
  };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response & { cookie: ReturnType<typeof vi.fn> };
}

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe("auth controller cookie settings", () => {
  it("uses secure + SameSite none in production", async () => {
    vi.resetModules();
    process.env.NODE_ENV = "production";

    const { signupHandler } = await import("./controller.js");

    serviceMocks.signUp.mockResolvedValueOnce({ accessToken: "access", refreshToken: "refresh" });

    const res = mockResponse();
    await signupHandler(
      { body: { enterpriseCode: "ENT", email: "user@example.com", password: "pw" } } as any,
      res as any,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "refresh",
      expect.objectContaining({ secure: true, sameSite: "none" }),
    );
  });
});
