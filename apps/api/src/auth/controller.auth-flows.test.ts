import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  updateProfileHandler,
  requestEmailChangeHandler,
  confirmEmailChangeHandler,
} from "./controller.js";

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

function mockResponse() {
  const res: Partial<Response> & {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  } = {
    status: vi.fn(),
    json: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response & { cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };
}

describe("auth controller auth flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signupHandler validates required fields", async () => {
    const res = mockResponse();
    await signupHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("signupHandler validates role", async () => {
    const res = mockResponse();
    await signupHandler({ body: { enterpriseCode: "E1", email: "a@b.com", password: "x", role: "OWNER" } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid role" });
  });

  it("signupHandler signs up and sets cookie", async () => {
    (service.signUp as any).mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });
    const res = mockResponse();
    await signupHandler(
      { body: { enterpriseCode: "ENT", email: "User@Example.com", password: "x", role: "staff" } } as any,
      res as any,
    );
    expect(service.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ enterpriseCode: "ENT", role: "STAFF", email: "User@Example.com" }),
    );
    expect(res.cookie).toHaveBeenCalledWith("refresh_token", "refresh", expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ accessToken: "access" });
  });

  it("signupHandler maps enterprise and email errors", async () => {
    const res = mockResponse();

    (service.signUp as any).mockRejectedValueOnce({ code: "ENTERPRISE_CODE_REQUIRED" });
    await signupHandler({ body: { enterpriseCode: "ENT", email: "a@b.com", password: "x" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.signUp as any).mockRejectedValueOnce({ code: "ENTERPRISE_NOT_FOUND" });
    await signupHandler({ body: { enterpriseCode: "ENT", email: "a@b.com", password: "x" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(404);

    (service.signUp as any).mockRejectedValueOnce({ code: "EMAIL_TAKEN" });
    await signupHandler({ body: { enterpriseCode: "ENT", email: "a@b.com", password: "x" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.signUp as any).mockRejectedValueOnce(new Error("boom"));
    await signupHandler({ body: { enterpriseCode: "ENT", email: "a@b.com", password: "x" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("loginHandler validates required fields", async () => {
    const res = mockResponse();
    await loginHandler({ body: { email: "x" } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("loginHandler logs in and maps errors", async () => {
    const res = mockResponse();

    (service.login as any).mockResolvedValueOnce({ accessToken: "a", refreshToken: "r" });
    await loginHandler({ body: { email: "a@b.com", password: "pw" }, ip: "1.1.1.1", get: vi.fn().mockReturnValue("ua") } as any, res as any);
    expect(service.login).toHaveBeenCalledWith({ email: "a@b.com", password: "pw" }, { ip: "1.1.1.1", userAgent: "ua" });
    expect(res.cookie).toHaveBeenCalled();

    (service.login as any).mockRejectedValueOnce({ code: "INVALID_CREDENTIALS" });
    await loginHandler({ body: { email: "a@b.com", password: "pw" }, get: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(401);

    (service.login as any).mockRejectedValueOnce({ code: "ACCOUNT_SUSPENDED" });
    await loginHandler({ body: { email: "a@b.com", password: "pw" }, get: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    (service.login as any).mockRejectedValueOnce(new Error("boom"));
    await loginHandler({ body: { email: "a@b.com", password: "pw" }, get: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("refreshHandler handles missing token and success", async () => {
    const res = mockResponse();

    await refreshHandler({ cookies: {}, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    (service.refreshTokens as any).mockResolvedValueOnce({ accessToken: "a", refreshToken: "r" });
    await refreshHandler({ cookies: { refresh_token: "rt" }, body: {} } as any, res as any);
    expect(service.refreshTokens).toHaveBeenCalledWith("rt");
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenLastCalledWith({ accessToken: "a" });
  });

  it("refreshHandler maps error branches", async () => {
    const res = mockResponse();

    (service.refreshTokens as any).mockRejectedValueOnce({ code: "ACCOUNT_SUSPENDED" });
    await refreshHandler({ cookies: { refresh_token: "rt" }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(403);

    (service.refreshTokens as any).mockRejectedValueOnce({ code: "INVALID_REFRESH_TOKEN" });
    await refreshHandler({ cookies: { refresh_token: "rt" }, body: {} } as any, res as any);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenLastCalledWith(401);

    (service.refreshTokens as any).mockRejectedValueOnce(new Error("bad"));
    await refreshHandler({ cookies: { refresh_token: "rt" }, body: {} } as any, res as any);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenLastCalledWith(401);
  });

  it("logoutHandler clears cookie for both token and no-token cases", async () => {
    const res = mockResponse();

    await logoutHandler({ cookies: {}, body: {} } as any, res as any);
    expect(service.logout).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();

    (service.logout as any).mockResolvedValueOnce(undefined);
    await logoutHandler({ cookies: { refresh_token: "rt" }, get: vi.fn().mockReturnValue("ua"), ip: "2.2.2.2" } as any, res as any);
    expect(service.logout).toHaveBeenCalledWith("rt", { ip: "2.2.2.2", userAgent: "ua" });

    (service.logout as any).mockRejectedValueOnce(new Error("expired"));
    await logoutHandler({ body: { refreshToken: "body-token" }, get: vi.fn() } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });
  });

  it("forgotPasswordHandler maps validation/success/error", async () => {
    const res = mockResponse();

    await forgotPasswordHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    (service.requestPasswordReset as any).mockResolvedValueOnce(undefined);
    await forgotPasswordHandler({ body: { email: "a@b.com" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });

    (service.requestPasswordReset as any).mockRejectedValueOnce(new Error("fail"));
    await forgotPasswordHandler({ body: { email: "a@b.com" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("resetPasswordHandler maps validation and domain errors", async () => {
    const res = mockResponse();

    await resetPasswordHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    (service.resetPassword as any).mockResolvedValueOnce(undefined);
    await resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });

    (service.resetPassword as any).mockRejectedValueOnce({ code: "INVALID_RESET_TOKEN" });
    await resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.resetPassword as any).mockRejectedValueOnce({ code: "USED_RESET_TOKEN" });
    await resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.resetPassword as any).mockRejectedValueOnce({ code: "EXPIRED_RESET_TOKEN" });
    await resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.resetPassword as any).mockRejectedValueOnce(new Error("oops"));
    await resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it.each([
    { name: "signupHandler", run: (res: any) => signupHandler({} as any, res as any) },
    { name: "loginHandler", run: (res: any) => loginHandler({} as any, res as any) },
    { name: "forgotPasswordHandler", run: (res: any) => forgotPasswordHandler({} as any, res as any) },
    { name: "resetPasswordHandler", run: (res: any) => resetPasswordHandler({} as any, res as any) },
  ])("$name validates nullish request bodies", async ({ run }) => {
    const res = mockResponse();
    await run(res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updateProfileHandler maps nullish body to undefined profile fields", async () => {
    const res = mockResponse();

    await updateProfileHandler({ user: { sub: 1 } } as any, res as any);

    expect(service.updateProfile).toHaveBeenCalledWith({
      userId: 1,
      firstName: undefined,
      lastName: undefined,
      avatarBase64: undefined,
      avatarMime: undefined,
    });
  });

  it("requestEmailChangeHandler validates nullish request body", async () => {
    const res = mockResponse();
    await requestEmailChangeHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("confirmEmailChangeHandler validates nullish request body", async () => {
    const res = mockResponse();
    await confirmEmailChangeHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("signupHandler uses error.code in fallback details", async () => {
    const res = mockResponse();
    (service.signUp as any).mockRejectedValueOnce({ code: "UNEXPECTED_SIGNUP" });

    await signupHandler({ body: { enterpriseCode: "ENT", email: "a@b.com", password: "x" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "signup failed", detail: "UNEXPECTED_SIGNUP" });
  });

  it("signupHandler stringifies fallback details when error code is missing", async () => {
    const res = mockResponse();
    (service.signUp as any).mockRejectedValueOnce({});

    await signupHandler({ body: { enterpriseCode: "ENT", email: "a@b.com", password: "x" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "signup failed", detail: "[object Object]" });
  });

  it("loginHandler uses error.code in fallback details", async () => {
    const res = mockResponse();
    (service.login as any).mockRejectedValueOnce({ code: "UNEXPECTED_LOGIN" });

    await loginHandler({ body: { email: "a@b.com", password: "x" }, get: vi.fn() } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "login failed", detail: "UNEXPECTED_LOGIN" });
  });

  it("loginHandler stringifies fallback details when error code is missing", async () => {
    const res = mockResponse();
    (service.login as any).mockRejectedValueOnce({});

    await loginHandler({ body: { email: "a@b.com", password: "x" }, get: vi.fn() } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "login failed", detail: "[object Object]" });
  });

  it("refreshHandler stringifies fallback details when refresh fails unexpectedly", async () => {
    const res = mockResponse();
    (service.refreshTokens as any).mockRejectedValueOnce({});

    await refreshHandler({ cookies: { refresh_token: "rt" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "invalid refresh token", detail: "[object Object]" });
  });

  it("forgotPasswordHandler stringifies fallback details when reset request fails unexpectedly", async () => {
    const res = mockResponse();
    (service.requestPasswordReset as any).mockRejectedValueOnce({});

    await forgotPasswordHandler({ body: { email: "a@b.com" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "forgot password failed", detail: "[object Object]" });
  });

  it("resetPasswordHandler stringifies fallback details when reset fails unexpectedly", async () => {
    const res = mockResponse();
    (service.resetPassword as any).mockRejectedValueOnce({});

    await resetPasswordHandler({ body: { token: "t", newPassword: "x" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "reset password failed", detail: "[object Object]" });
  });
});
