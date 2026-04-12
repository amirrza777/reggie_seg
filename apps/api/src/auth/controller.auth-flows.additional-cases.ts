import type { Response } from "express";
import { expect, it, vi } from "vitest";

type RouteHandler = (req: unknown, res: Response) => Promise<unknown>;

type AuthControllerExtraTestContext = {
  confirmEmailChangeHandler: RouteHandler;
  deleteAccountHandler: RouteHandler;
  forgotPasswordHandler: RouteHandler;
  joinEnterpriseByCodeHandler: RouteHandler;
  leaveEnterpriseHandler: RouteHandler;
  loginHandler: RouteHandler;
  logoutHandler: RouteHandler;
  refreshHandler: RouteHandler;
  requestEmailChangeHandler: RouteHandler;
  resetPasswordHandler: RouteHandler;
  signupHandler: RouteHandler;
  updateProfileHandler: RouteHandler;
  service: any;
  mockResponse: () => Response & { cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };
};

export function registerAuthControllerExtraTests(ctx: AuthControllerExtraTestContext) {
  it("loginHandler validates required fields", async () => {
    const res = ctx.mockResponse();
    await ctx.loginHandler({ body: { email: "x" } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("loginHandler logs in and maps errors", async () => {
    const res = ctx.mockResponse();

    ctx.service.login.mockResolvedValueOnce({ accessToken: "a", refreshToken: "r" });
    await ctx.loginHandler({ body: { email: "a@b.com", password: "pw" }, ip: "1.1.1.1", get: vi.fn().mockReturnValue("ua") } as any, res as any);
    expect(ctx.service.login).toHaveBeenCalledWith({ email: "a@b.com", password: "pw" }, { ip: "1.1.1.1", userAgent: "ua" });
    expect(res.cookie).toHaveBeenCalled();

    ctx.service.login.mockRejectedValueOnce({ code: "INVALID_CREDENTIALS" });
    await ctx.loginHandler({ body: { email: "a@b.com", password: "pw" }, get: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(401);

    ctx.service.login.mockRejectedValueOnce({ code: "ACCOUNT_SUSPENDED" });
    await ctx.loginHandler({ body: { email: "a@b.com", password: "pw" }, get: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    ctx.service.login.mockRejectedValueOnce({ code: "AMBIGUOUS_EMAIL_ACCOUNT" });
    await ctx.loginHandler({ body: { email: "a@b.com", password: "pw" }, get: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    ctx.service.login.mockRejectedValueOnce(new Error("boom"));
    await ctx.loginHandler({ body: { email: "a@b.com", password: "pw" }, get: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("refreshHandler handles missing token and success", async () => {
    const res = ctx.mockResponse();

    await ctx.refreshHandler({ cookies: {}, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    ctx.service.refreshTokens.mockResolvedValueOnce({ accessToken: "a", refreshToken: "r" });
    await ctx.refreshHandler({ cookies: { refresh_token: "rt" }, body: {} } as any, res as any);
    expect(ctx.service.refreshTokens).toHaveBeenCalledWith("rt");
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenLastCalledWith({ accessToken: "a" });
  });

  it("refreshHandler maps error branches", async () => {
    const res = ctx.mockResponse();

    ctx.service.refreshTokens.mockRejectedValueOnce({ code: "ACCOUNT_SUSPENDED" });
    await ctx.refreshHandler({ cookies: { refresh_token: "rt" }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(403);

    ctx.service.refreshTokens.mockRejectedValueOnce({ code: "INVALID_REFRESH_TOKEN" });
    await ctx.refreshHandler({ cookies: { refresh_token: "rt" }, body: {} } as any, res as any);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenLastCalledWith(401);

    ctx.service.refreshTokens.mockRejectedValueOnce(new Error("bad"));
    await ctx.refreshHandler({ cookies: { refresh_token: "rt" }, body: {} } as any, res as any);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenLastCalledWith(401);
  });

  it("logoutHandler clears cookie for both token and no-token cases", async () => {
    const res = ctx.mockResponse();

    await ctx.logoutHandler({ cookies: {}, body: {} } as any, res as any);
    expect(ctx.service.logout).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();

    ctx.service.logout.mockResolvedValueOnce(undefined);
    await ctx.logoutHandler({ cookies: { refresh_token: "rt" }, get: vi.fn().mockReturnValue("ua"), ip: "2.2.2.2" } as any, res as any);
    expect(ctx.service.logout).toHaveBeenCalledWith("rt", { ip: "2.2.2.2", userAgent: "ua" });

    ctx.service.logout.mockRejectedValueOnce(new Error("expired"));
    await ctx.logoutHandler({ body: { refreshToken: "body-token" }, get: vi.fn() } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });
  });

  it("forgotPasswordHandler maps validation/success/error", async () => {
    const res = ctx.mockResponse();

    await ctx.forgotPasswordHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    ctx.service.requestPasswordReset.mockResolvedValueOnce(undefined);
    await ctx.forgotPasswordHandler({ body: { email: "a@b.com" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });

    ctx.service.requestPasswordReset.mockRejectedValueOnce(new Error("fail"));
    await ctx.forgotPasswordHandler({ body: { email: "a@b.com" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("resetPasswordHandler maps validation and domain errors", async () => {
    const res = ctx.mockResponse();

    await ctx.resetPasswordHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    ctx.service.resetPassword.mockResolvedValueOnce(undefined);
    await ctx.resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });

    ctx.service.resetPassword.mockRejectedValueOnce({ code: "INVALID_RESET_TOKEN" });
    await ctx.resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    ctx.service.resetPassword.mockRejectedValueOnce({ code: "USED_RESET_TOKEN" });
    await ctx.resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    ctx.service.resetPassword.mockRejectedValueOnce({ code: "EXPIRED_RESET_TOKEN" });
    await ctx.resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    ctx.service.resetPassword.mockRejectedValueOnce(new Error("oops"));
    await ctx.resetPasswordHandler({ body: { token: "t", newPassword: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it.each([
    { name: "signupHandler", run: (res: any) => ctx.signupHandler({} as any, res as any) },
    { name: "loginHandler", run: (res: any) => ctx.loginHandler({} as any, res as any) },
    { name: "forgotPasswordHandler", run: (res: any) => ctx.forgotPasswordHandler({} as any, res as any) },
    { name: "resetPasswordHandler", run: (res: any) => ctx.resetPasswordHandler({} as any, res as any) },
  ])("$name validates nullish request bodies", async ({ run }) => {
    const res = ctx.mockResponse();
    await run(res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updateProfileHandler maps nullish body to undefined profile fields", async () => {
    const res = ctx.mockResponse();

    await ctx.updateProfileHandler({ user: { sub: 1 } } as any, res as any);

    expect(ctx.service.updateProfile).toHaveBeenCalledWith({
      userId: 1,
      firstName: undefined,
      lastName: undefined,
      avatarBase64: undefined,
      avatarMime: undefined,
    });
  });

  it("requestEmailChangeHandler validates nullish request body", async () => {
    const res = ctx.mockResponse();
    await ctx.requestEmailChangeHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("confirmEmailChangeHandler validates nullish request body", async () => {
    const res = ctx.mockResponse();
    await ctx.confirmEmailChangeHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("deleteAccountHandler validates payload and maps account deletion errors", async () => {
    const res = ctx.mockResponse();

    await ctx.deleteAccountHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    ctx.service.deleteAccount.mockResolvedValueOnce(undefined);
    await ctx.deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(ctx.service.deleteAccount).toHaveBeenCalledWith({ userId: 1, password: "pw" });
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenLastCalledWith({ success: true });

    ctx.service.deleteAccount.mockRejectedValueOnce({ code: "INVALID_PASSWORD" });
    await ctx.deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(401);

    ctx.service.deleteAccount.mockRejectedValueOnce({ code: "USER_NOT_FOUND" });
    await ctx.deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(404);

    ctx.service.deleteAccount.mockRejectedValueOnce({ code: "ACCOUNT_DELETE_FORBIDDEN" });
    await ctx.deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    ctx.service.deleteAccount.mockRejectedValueOnce({});
    await ctx.deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("joinEnterpriseByCodeHandler validates payload and maps domain errors", async () => {
    const res = ctx.mockResponse();

    await ctx.joinEnterpriseByCodeHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    ctx.service.joinEnterpriseByCode.mockResolvedValueOnce({
      enterpriseId: "ent-2",
      enterpriseName: "Enterprise Two",
    });
    await ctx.joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(ctx.service.joinEnterpriseByCode).toHaveBeenCalledWith({ userId: 1, enterpriseCode: "ENT2" });
    expect(res.json).toHaveBeenLastCalledWith({
      success: true,
      enterpriseId: "ent-2",
      enterpriseName: "Enterprise Two",
    });

    ctx.service.joinEnterpriseByCode.mockRejectedValueOnce({ code: "ENTERPRISE_NOT_FOUND" });
    await ctx.joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "MISS" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(404);

    ctx.service.joinEnterpriseByCode.mockRejectedValueOnce({ code: "ENTERPRISE_ACCESS_BLOCKED" });
    await ctx.joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    ctx.service.joinEnterpriseByCode.mockRejectedValueOnce({ code: "ENTERPRISE_JOIN_NOT_ALLOWED" });
    await ctx.joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    ctx.service.joinEnterpriseByCode.mockRejectedValueOnce({ code: "EMAIL_TAKEN" });
    await ctx.joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    ctx.service.joinEnterpriseByCode.mockRejectedValueOnce({});
    await ctx.joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("leaveEnterpriseHandler maps success and domain errors", async () => {
    const res = ctx.mockResponse();

    ctx.service.leaveEnterprise.mockResolvedValueOnce({
      enterpriseId: "ent-unassigned",
    });
    await ctx.leaveEnterpriseHandler({ user: { sub: 1 } } as any, res as any);
    expect(ctx.service.leaveEnterprise).toHaveBeenCalledWith({ userId: 1 });
    expect(res.json).toHaveBeenLastCalledWith({ success: true, enterpriseId: "ent-unassigned" });

    ctx.service.leaveEnterprise.mockRejectedValueOnce({ code: "ALREADY_UNASSIGNED" });
    await ctx.leaveEnterpriseHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    ctx.service.leaveEnterprise.mockRejectedValueOnce({ code: "ACCOUNT_LEAVE_FORBIDDEN" });
    await ctx.leaveEnterpriseHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    ctx.service.leaveEnterprise.mockRejectedValueOnce({});
    await ctx.leaveEnterpriseHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("signupHandler uses error.code in fallback details", async () => {
    const res = ctx.mockResponse();
    ctx.service.signUp.mockRejectedValueOnce({ code: "UNEXPECTED_SIGNUP" });

    await ctx.signupHandler({ body: { enterpriseCode: "ENT", email: "a@b.com", password: "x" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "signup failed", detail: "UNEXPECTED_SIGNUP" });
  });

  it("signupHandler stringifies fallback details when error code is missing", async () => {
    const res = ctx.mockResponse();
    ctx.service.signUp.mockRejectedValueOnce({});

    await ctx.signupHandler({ body: { enterpriseCode: "ENT", email: "a@b.com", password: "x" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "signup failed", detail: "[object Object]" });
  });

  it("loginHandler uses error.code in fallback details", async () => {
    const res = ctx.mockResponse();
    ctx.service.login.mockRejectedValueOnce({ code: "UNEXPECTED_LOGIN" });

    await ctx.loginHandler({ body: { email: "a@b.com", password: "x" }, get: vi.fn() } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "login failed", detail: "UNEXPECTED_LOGIN" });
  });

  it("loginHandler stringifies fallback details when error code is missing", async () => {
    const res = ctx.mockResponse();
    ctx.service.login.mockRejectedValueOnce({});

    await ctx.loginHandler({ body: { email: "a@b.com", password: "x" }, get: vi.fn() } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "login failed", detail: "[object Object]" });
  });

  it("refreshHandler stringifies fallback details when refresh fails unexpectedly", async () => {
    const res = ctx.mockResponse();
    ctx.service.refreshTokens.mockRejectedValueOnce({});

    await ctx.refreshHandler({ cookies: { refresh_token: "rt" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "invalid refresh token", detail: "[object Object]" });
  });

  it("forgotPasswordHandler stringifies fallback details when reset request fails unexpectedly", async () => {
    const res = ctx.mockResponse();
    ctx.service.requestPasswordReset.mockRejectedValueOnce({});

    await ctx.forgotPasswordHandler({ body: { email: "a@b.com" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "forgot password failed", detail: "[object Object]" });
  });

  it("resetPasswordHandler stringifies fallback details when reset fails unexpectedly", async () => {
    const res = ctx.mockResponse();
    ctx.service.resetPassword.mockRejectedValueOnce({});

    await ctx.resetPasswordHandler({ body: { token: "t", newPassword: "x" } } as any, res as any);

    expect(res.json).toHaveBeenLastCalledWith({ error: "reset password failed", detail: "[object Object]" });
  });
}
