import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./service.js", () => ({
  signUp: vi.fn(),
  login: vi.fn(),
  refreshTokens: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  requestEmailChange: vi.fn(),
  confirmEmailChange: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock("../shared/db.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
  },
}));

import * as service from "./service.js";
import { prisma } from "../shared/db.js";
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
} from "./controller.js";

function mockRes() {
  const res: any = { status: vi.fn(), json: vi.fn(), cookie: vi.fn(), clearCookie: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("auth controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signupHandler rejects invalid role", async () => {
    const res = mockRes();
    await signupHandler({ body: { email: "a", password: "b", role: "ADMIN" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("signupHandler sets refresh cookie on success", async () => {
    (service.signUp as any).mockResolvedValue({ accessToken: "acc", refreshToken: "ref" });
    const res = mockRes();

    await signupHandler({ body: { email: "a@b.com", password: "pw" } } as any, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "ref",
      expect.objectContaining({ httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 30 })
    );
    expect(res.json).toHaveBeenCalledWith({ accessToken: "acc" });
  });

  it("loginHandler maps INVALID_CREDENTIALS to 401", async () => {
    (service.login as any).mockRejectedValue({ code: "INVALID_CREDENTIALS" });
    const res = mockRes();

    await loginHandler({ body: { email: "a", password: "b" }, get: vi.fn() } as any, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
  });

  it("refreshHandler clears cookie and returns 401 on invalid refresh token", async () => {
    (service.refreshTokens as any).mockRejectedValue({ code: "INVALID_REFRESH_TOKEN" });
    const res = mockRes();

    await refreshHandler({ cookies: { refresh_token: "bad" }, body: {} } as any, res);

    expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("logoutHandler clears cookie and succeeds even when service throws", async () => {
    (service.logout as any).mockRejectedValue(new Error("already revoked"));
    const res = mockRes();

    await logoutHandler({ cookies: { refresh_token: "rt" }, body: {}, get: vi.fn() } as any, res);

    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("meHandler returns enriched profile for authenticated user", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 7,
      role: "STAFF",
      active: true,
      email: "u@test.com",
    });
    (service.getProfile as any).mockResolvedValue({ id: 7, email: "u@test.com", firstName: "A", lastName: "B" });
    const res = mockRes();

    await meHandler({ user: { sub: 7 } } as any, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, isStaff: true, isAdmin: false, isEnterpriseAdmin: false, role: "STAFF" })
    );
  });
});
