import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  acceptEnterpriseAdminInviteHandler,
  acceptGlobalAdminInviteHandler,
  getEnterpriseAdminInviteStateHandler,
  getGlobalAdminInviteStateHandler,
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  updateProfileHandler,
  requestEmailChangeHandler,
  confirmEmailChangeHandler,
  deleteAccountHandler,
  joinEnterpriseByCodeHandler,
  leaveEnterpriseHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
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
  joinEnterpriseByCode: vi.fn(),
  leaveEnterprise: vi.fn(),
  validateRefreshTokenSession: vi.fn(),
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

  it("acceptEnterpriseAdminInviteHandler validates input, sets cookie, and maps token errors", async () => {
    const res = mockResponse();

    await acceptEnterpriseAdminInviteHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.acceptEnterpriseAdminInvite as any).mockResolvedValueOnce({
      accessToken: "invite-access",
      refreshToken: "invite-refresh",
    });
    await acceptEnterpriseAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(service.acceptEnterpriseAdminInvite).toHaveBeenCalledWith({ token: "abc123", newPassword: "pass123" });
    expect(res.cookie).toHaveBeenCalledWith("refresh_token", "invite-refresh", expect.any(Object));
    expect(res.json).toHaveBeenLastCalledWith({ accessToken: "invite-access" });

    (service.acceptEnterpriseAdminInvite as any).mockRejectedValueOnce({ code: "INVALID_ENTERPRISE_ADMIN_INVITE" });
    await acceptEnterpriseAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.acceptEnterpriseAdminInvite as any).mockRejectedValueOnce({ code: "USED_ENTERPRISE_ADMIN_INVITE" });
    await acceptEnterpriseAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.acceptEnterpriseAdminInvite as any).mockRejectedValueOnce({ code: "EXPIRED_ENTERPRISE_ADMIN_INVITE" });
    await acceptEnterpriseAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.acceptEnterpriseAdminInvite as any).mockRejectedValueOnce({ code: "EMAIL_ALREADY_USED_IN_OTHER_ENTERPRISE" });
    await acceptEnterpriseAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.acceptEnterpriseAdminInvite as any).mockRejectedValueOnce({ code: "AUTH_REQUIRED_FOR_EXISTING_ACCOUNT" });
    await acceptEnterpriseAdminInviteHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(401);

    (service.acceptEnterpriseAdminInvite as any).mockRejectedValueOnce({ code: "INVITE_EMAIL_MISMATCH" });
    await acceptEnterpriseAdminInviteHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    (service.acceptEnterpriseAdminInvite as any).mockRejectedValueOnce(new Error("invite-fail"));
    await acceptEnterpriseAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("getEnterpriseAdminInviteStateHandler validates input and maps invite errors", async () => {
    const res = mockResponse();

    await getEnterpriseAdminInviteStateHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.getEnterpriseAdminInviteState as any).mockResolvedValueOnce({ mode: "existing_account" });
    await getEnterpriseAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(service.getEnterpriseAdminInviteState).toHaveBeenCalledWith({ token: "abc123" });
    expect(res.json).toHaveBeenLastCalledWith({ mode: "existing_account" });

    (service.getEnterpriseAdminInviteState as any).mockRejectedValueOnce({ code: "INVALID_ENTERPRISE_ADMIN_INVITE" });
    await getEnterpriseAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.getEnterpriseAdminInviteState as any).mockRejectedValueOnce({ code: "USED_ENTERPRISE_ADMIN_INVITE" });
    await getEnterpriseAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.getEnterpriseAdminInviteState as any).mockRejectedValueOnce({ code: "EXPIRED_ENTERPRISE_ADMIN_INVITE" });
    await getEnterpriseAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.getEnterpriseAdminInviteState as any).mockRejectedValueOnce({ code: "EMAIL_ALREADY_USED_IN_OTHER_ENTERPRISE" });
    await getEnterpriseAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.getEnterpriseAdminInviteState as any).mockRejectedValueOnce(new Error("invite-state-fail"));
    await getEnterpriseAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("acceptGlobalAdminInviteHandler validates input, sets cookie, and maps token errors", async () => {
    const res = mockResponse();

    await acceptGlobalAdminInviteHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.acceptGlobalAdminInvite as any).mockResolvedValueOnce({
      accessToken: "invite-access",
      refreshToken: "invite-refresh",
    });
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(service.acceptGlobalAdminInvite).toHaveBeenCalledWith({ token: "abc123", newPassword: "pass123" });
    expect(res.cookie).toHaveBeenCalledWith("refresh_token", "invite-refresh", expect.any(Object));
    expect(res.json).toHaveBeenLastCalledWith({ accessToken: "invite-access" });

    (service.acceptGlobalAdminInvite as any).mockRejectedValueOnce({ code: "INVALID_GLOBAL_ADMIN_INVITE" });
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.acceptGlobalAdminInvite as any).mockRejectedValueOnce({ code: "USED_GLOBAL_ADMIN_INVITE" });
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.acceptGlobalAdminInvite as any).mockRejectedValueOnce({ code: "EXPIRED_GLOBAL_ADMIN_INVITE" });
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.acceptGlobalAdminInvite as any).mockRejectedValueOnce({ code: "AMBIGUOUS_EMAIL_ACCOUNT" });
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.acceptGlobalAdminInvite as any).mockRejectedValueOnce({ code: "EMAIL_ALREADY_USED_IN_ENTERPRISE_ACCOUNT" });
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.acceptGlobalAdminInvite as any).mockRejectedValueOnce({ code: "AUTH_REQUIRED_FOR_EXISTING_ACCOUNT" });
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(401);

    (service.acceptGlobalAdminInvite as any).mockRejectedValueOnce({ code: "INVITE_EMAIL_MISMATCH" });
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    (service.acceptGlobalAdminInvite as any).mockRejectedValueOnce(new Error("invite-fail"));
    await acceptGlobalAdminInviteHandler({ body: { token: "abc123", newPassword: "pass123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("getGlobalAdminInviteStateHandler validates input and maps invite errors", async () => {
    const res = mockResponse();

    await getGlobalAdminInviteStateHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.getGlobalAdminInviteState as any).mockResolvedValueOnce({ mode: "existing_account" });
    await getGlobalAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(service.getGlobalAdminInviteState).toHaveBeenCalledWith({ token: "abc123" });
    expect(res.json).toHaveBeenLastCalledWith({ mode: "existing_account" });

    (service.getGlobalAdminInviteState as any).mockRejectedValueOnce({ code: "INVALID_GLOBAL_ADMIN_INVITE" });
    await getGlobalAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.getGlobalAdminInviteState as any).mockRejectedValueOnce({ code: "USED_GLOBAL_ADMIN_INVITE" });
    await getGlobalAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.getGlobalAdminInviteState as any).mockRejectedValueOnce({ code: "EXPIRED_GLOBAL_ADMIN_INVITE" });
    await getGlobalAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.getGlobalAdminInviteState as any).mockRejectedValueOnce({ code: "AMBIGUOUS_EMAIL_ACCOUNT" });
    await getGlobalAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.getGlobalAdminInviteState as any).mockRejectedValueOnce({ code: "EMAIL_ALREADY_USED_IN_ENTERPRISE_ACCOUNT" });
    await getGlobalAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.getGlobalAdminInviteState as any).mockRejectedValueOnce(new Error("invite-state-fail"));
    await getGlobalAdminInviteStateHandler({ body: { token: "abc123" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("signupHandler signs up and sets cookie", async () => {
    (service.signUp as any).mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });
    const res = mockResponse();
    await signupHandler(
      { body: { enterpriseCode: "ENT", email: "User@Example.com", password: "x", role: "ADMIN" } } as any,
      res as any,
    );
    expect(service.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ enterpriseCode: "ENT", email: "User@Example.com" }),
    );
    expect((service.signUp as any).mock.calls[0][0]).not.toHaveProperty("role");
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

    (service.login as any).mockRejectedValueOnce({ code: "AMBIGUOUS_EMAIL_ACCOUNT" });
    await loginHandler({ body: { email: "a@b.com", password: "pw" }, get: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

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

  it("deleteAccountHandler validates payload and maps account deletion errors", async () => {
    const res = mockResponse();

    await deleteAccountHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    (service.deleteAccount as any).mockResolvedValueOnce(undefined);
    await deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(service.deleteAccount).toHaveBeenCalledWith({ userId: 1, password: "pw" });
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenLastCalledWith({ success: true });

    (service.deleteAccount as any).mockRejectedValueOnce({ code: "INVALID_PASSWORD" });
    await deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(401);

    (service.deleteAccount as any).mockRejectedValueOnce({ code: "USER_NOT_FOUND" });
    await deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(404);

    (service.deleteAccount as any).mockRejectedValueOnce({ code: "ACCOUNT_DELETE_FORBIDDEN" });
    await deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    (service.deleteAccount as any).mockRejectedValueOnce({});
    await deleteAccountHandler({ user: { sub: 1 }, body: { password: "pw" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("joinEnterpriseByCodeHandler validates payload and maps domain errors", async () => {
    const res = mockResponse();

    await joinEnterpriseByCodeHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    (service.joinEnterpriseByCode as any).mockResolvedValueOnce({
      enterpriseId: "ent-2",
      enterpriseName: "Enterprise Two",
    });
    await joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(service.joinEnterpriseByCode).toHaveBeenCalledWith({ userId: 1, enterpriseCode: "ENT2" });
    expect(res.json).toHaveBeenLastCalledWith({
      success: true,
      enterpriseId: "ent-2",
      enterpriseName: "Enterprise Two",
    });

    (service.joinEnterpriseByCode as any).mockRejectedValueOnce({ code: "ENTERPRISE_NOT_FOUND" });
    await joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "MISS" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(404);

    (service.joinEnterpriseByCode as any).mockRejectedValueOnce({ code: "ENTERPRISE_ACCESS_BLOCKED" });
    await joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    (service.joinEnterpriseByCode as any).mockRejectedValueOnce({ code: "ENTERPRISE_JOIN_NOT_ALLOWED" });
    await joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    (service.joinEnterpriseByCode as any).mockRejectedValueOnce({ code: "EMAIL_TAKEN" });
    await joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.joinEnterpriseByCode as any).mockRejectedValueOnce({});
    await joinEnterpriseByCodeHandler({ user: { sub: 1 }, body: { enterpriseCode: "ENT2" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("leaveEnterpriseHandler maps success and domain errors", async () => {
    const res = mockResponse();

    (service.leaveEnterprise as any).mockResolvedValueOnce({
      enterpriseId: "ent-unassigned",
    });
    await leaveEnterpriseHandler({ user: { sub: 1 } } as any, res as any);
    expect(service.leaveEnterprise).toHaveBeenCalledWith({ userId: 1 });
    expect(res.json).toHaveBeenLastCalledWith({ success: true, enterpriseId: "ent-unassigned" });

    (service.leaveEnterprise as any).mockRejectedValueOnce({ code: "ALREADY_UNASSIGNED" });
    await leaveEnterpriseHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.leaveEnterprise as any).mockRejectedValueOnce({ code: "ACCOUNT_LEAVE_FORBIDDEN" });
    await leaveEnterpriseHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(403);

    (service.leaveEnterprise as any).mockRejectedValueOnce({});
    await leaveEnterpriseHandler({ user: { sub: 1 } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
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
