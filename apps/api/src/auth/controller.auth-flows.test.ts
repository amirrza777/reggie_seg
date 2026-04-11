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
import { registerAuthControllerExtraTests } from "./controller.auth-flows.additional-cases.js";

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

  registerAuthControllerExtraTests({
    confirmEmailChangeHandler,
    deleteAccountHandler,
    forgotPasswordHandler,
    joinEnterpriseByCodeHandler,
    leaveEnterpriseHandler,
    loginHandler,
    logoutHandler,
    refreshHandler,
    requestEmailChangeHandler,
    resetPasswordHandler,
    signupHandler,
    updateProfileHandler,
    service: service as any,
    mockResponse,
  });
});
