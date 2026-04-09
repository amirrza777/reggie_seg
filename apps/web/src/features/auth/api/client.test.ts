import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/errors";

const apiFetchMock = vi.fn();
const setAccessTokenMock = vi.fn();
const clearAccessTokenMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock("./session", () => ({
  setAccessToken: (...args: unknown[]) => setAccessTokenMock(...args),
  clearAccessToken: (...args: unknown[]) => clearAccessTokenMock(...args),
}));

import {
  acceptEnterpriseAdminInvite,
  confirmEmailChange,
  deleteAccount,
  getCurrentUser,
  joinEnterpriseByCode,
  leaveEnterprise,
  login,
  logout,
  refreshAccessToken,
  requestEmailChange,
  requestPasswordReset,
  resetPassword,
  signup,
  updateProfile,
} from "./client";

describe("auth api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    setAccessTokenMock.mockReset();
    clearAccessTokenMock.mockReset();
  });

  it("logs in and stores access token", async () => {
    apiFetchMock.mockResolvedValue({ accessToken: "token-1" });

    const result = await login({ email: "user@kcl.ac.uk", password: "secret" });

    expect(apiFetchMock).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email: "user@kcl.ac.uk", password: "secret" }),
    });
    expect(setAccessTokenMock).toHaveBeenCalledWith("token-1");
    expect(result).toEqual({ accessToken: "token-1" });
  });

  it("signs up and stores access token", async () => {
    apiFetchMock.mockResolvedValue({ accessToken: "token-2" });

    await signup({
      enterpriseCode: "DEFAULT",
      email: "user@kcl.ac.uk",
      password: "secret",
      firstName: "Ayan",
      lastName: "Mamun",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/auth/signup", {
      method: "POST",
      auth: false,
      body: JSON.stringify({
        enterpriseCode: "DEFAULT",
        email: "user@kcl.ac.uk",
        password: "secret",
        firstName: "Ayan",
        lastName: "Mamun",
      }),
    });
    expect(setAccessTokenMock).toHaveBeenCalledWith("token-2");
  });

  it("requests password reset", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    await requestPasswordReset("user@kcl.ac.uk");
    expect(apiFetchMock).toHaveBeenCalledWith("/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email: "user@kcl.ac.uk" }),
    });
  });

  it("accepts an enterprise admin invite and stores access token", async () => {
    apiFetchMock.mockResolvedValue({ accessToken: "invite-token" });

    await acceptEnterpriseAdminInvite({
      token: "abc123",
      firstName: "Ada",
      lastName: "Lovelace",
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/auth/enterprise-admin/accept", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ token: "abc123", firstName: "Ada", lastName: "Lovelace" }),
    });
    expect(setAccessTokenMock).toHaveBeenCalledWith("invite-token");
  });

  it("submits reset password payload", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    await resetPassword({ token: "abc", newPassword: "new-pass" });
    expect(apiFetchMock).toHaveBeenCalledWith("/auth/reset-password", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ token: "abc", newPassword: "new-pass" }),
    });
  });

  it("refreshes access token and returns token", async () => {
    apiFetchMock.mockResolvedValue({ accessToken: "new-token" });

    const token = await refreshAccessToken();

    expect(apiFetchMock).toHaveBeenCalledWith("/auth/refresh", { method: "POST" });
    expect(setAccessTokenMock).toHaveBeenCalledWith("new-token");
    expect(token).toBe("new-token");
  });

  it("returns null when refresh fails", async () => {
    apiFetchMock.mockRejectedValue(new Error("boom"));
    const token = await refreshAccessToken();
    expect(token).toBeNull();
  });

  it("retries getCurrentUser after 401 when refresh succeeds", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new ApiError("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce({ accessToken: "token-3" })
      .mockResolvedValueOnce({ id: 1, email: "user@kcl.ac.uk" });

    const user = await getCurrentUser();

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/auth/me");
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/auth/refresh", { method: "POST" });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/auth/me");
    expect(setAccessTokenMock).toHaveBeenCalledWith("token-3");
    expect(user).toEqual({ id: 1, email: "user@kcl.ac.uk" });
  });

  it("returns null from getCurrentUser when refresh fails", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new ApiError("Unauthorized", { status: 401 }))
      .mockRejectedValueOnce(new Error("refresh failed"));
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it("retries updateProfile after 401 when refresh succeeds", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new ApiError("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce({ accessToken: "token-4" })
      .mockResolvedValueOnce({ id: 1, firstName: "Ayan" });

    const result = await updateProfile({ firstName: "Ayan" });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Ayan" }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/auth/refresh", { method: "POST" });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Ayan" }),
    });
    expect(result).toEqual({ id: 1, firstName: "Ayan" });
  });

  it("calls email change request endpoints", async () => {
    apiFetchMock.mockResolvedValue(undefined);

    await requestEmailChange("new@kcl.ac.uk");
    await confirmEmailChange({ newEmail: "new@kcl.ac.uk", code: "123456" });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/auth/email-change/request", {
      method: "POST",
      body: JSON.stringify({ newEmail: "new@kcl.ac.uk" }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/auth/email-change/confirm", {
      method: "POST",
      body: JSON.stringify({ newEmail: "new@kcl.ac.uk", code: "123456" }),
    });
  });

  it("clears access token on logout even if request fails", async () => {
    apiFetchMock.mockRejectedValue(new Error("network error"));
    await expect(logout()).rejects.toThrow("network error");
    expect(apiFetchMock).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    expect(clearAccessTokenMock).toHaveBeenCalled();
  });

  it("deletes account and clears access token", async () => {
    apiFetchMock.mockResolvedValue(undefined);

    await deleteAccount({ password: "secret" });

    expect(apiFetchMock).toHaveBeenCalledWith("/auth/account/delete", {
      method: "POST",
      body: JSON.stringify({ password: "secret" }),
    });
    expect(clearAccessTokenMock).toHaveBeenCalled();
  });

  it("retries deleteAccount after 401 when refresh succeeds", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new ApiError("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce({ accessToken: "token-5" })
      .mockResolvedValueOnce(undefined);

    await deleteAccount({ password: "secret" });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/auth/account/delete", {
      method: "POST",
      body: JSON.stringify({ password: "secret" }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/auth/refresh", { method: "POST" });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/auth/account/delete", {
      method: "POST",
      body: JSON.stringify({ password: "secret" }),
    });
    expect(clearAccessTokenMock).toHaveBeenCalled();
  });

  it("joins enterprise by code", async () => {
    apiFetchMock.mockResolvedValue(undefined);

    await joinEnterpriseByCode({ enterpriseCode: "ENT2" });

    expect(apiFetchMock).toHaveBeenCalledWith("/auth/enterprise/join", {
      method: "POST",
      body: JSON.stringify({ enterpriseCode: "ENT2" }),
    });
  });

  it("retries joinEnterpriseByCode after 401 when refresh succeeds", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new ApiError("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce({ accessToken: "token-6" })
      .mockResolvedValueOnce(undefined);

    await joinEnterpriseByCode({ enterpriseCode: "ENT2" });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/auth/enterprise/join", {
      method: "POST",
      body: JSON.stringify({ enterpriseCode: "ENT2" }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/auth/refresh", { method: "POST" });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/auth/enterprise/join", {
      method: "POST",
      body: JSON.stringify({ enterpriseCode: "ENT2" }),
    });
  });

  it("leaves enterprise", async () => {
    apiFetchMock.mockResolvedValue(undefined);

    await leaveEnterprise();

    expect(apiFetchMock).toHaveBeenCalledWith("/auth/enterprise/leave", {
      method: "POST",
    });
  });

  it("retries leaveEnterprise after 401 when refresh succeeds", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new ApiError("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce({ accessToken: "token-7" })
      .mockResolvedValueOnce(undefined);

    await leaveEnterprise();

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/auth/enterprise/leave", {
      method: "POST",
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/auth/refresh", { method: "POST" });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/auth/enterprise/leave", {
      method: "POST",
    });
  });
});
