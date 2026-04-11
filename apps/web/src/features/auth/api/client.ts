import { apiFetch } from "@/shared/api/http";
import type {
  AuthResponse,
  EnterpriseAdminInviteState,
  GlobalAdminInviteState,
  LoginCredentials,
  SignupPayload,
  UserProfile,
} from "../types";
import { setAccessToken, clearAccessToken } from "./session";
import { ApiError } from "@/shared/api/errors";

function isUnauthorizedApiError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify(credentials),
  });
  if (res.accessToken) {
    setAccessToken(res.accessToken);
  }
  return res;
}

export async function signup(payload: SignupPayload) {
  const res = await apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
  if (res.accessToken) {
    setAccessToken(res.accessToken);
  }
  return res;
}

export async function acceptEnterpriseAdminInvite(payload: {
  token: string;
  newPassword?: string;
  firstName?: string;
  lastName?: string;
}) {
  const res = await apiFetch<AuthResponse>("/auth/enterprise-admin/accept", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
  if (res.accessToken) {
    setAccessToken(res.accessToken);
  }
  return res;
}

export async function getEnterpriseAdminInviteState(token: string) {
  return apiFetch<EnterpriseAdminInviteState>("/auth/enterprise-admin/state", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ token }),
  });
}

export async function acceptGlobalAdminInvite(payload: {
  token: string;
  newPassword?: string;
  firstName?: string;
  lastName?: string;
}) {
  const res = await apiFetch<AuthResponse>("/auth/global-admin/accept", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
  if (res.accessToken) {
    setAccessToken(res.accessToken);
  }
  return res;
}

export async function getGlobalAdminInviteState(token: string) {
  return apiFetch<GlobalAdminInviteState>("/auth/global-admin/state", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ token }),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  return apiFetch<void>("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(payload: { token: string; newPassword: string }): Promise<void> {
  return apiFetch<void>("/auth/reset-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await apiFetch<{ accessToken: string }>("/auth/refresh", { method: "POST" });
    if (res.accessToken) {
      setAccessToken(res.accessToken);
      return res.accessToken;
    }
    clearAccessToken();
    return null;
  } catch (err: unknown) {
    if (isUnauthorizedApiError(err)) {
      clearAccessToken();
    }
    return null;
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    return await apiFetch<UserProfile>("/auth/me");
  } catch (err: unknown) {
    if (!isUnauthorizedApiError(err)) {
      throw err;
    }
    const token = await refreshAccessToken();
    if (!token) {
      return null;
    }
    return await apiFetch<UserProfile>("/auth/me");
  }
}

export async function updateProfile(payload: {
  firstName?: string;
  lastName?: string;
  avatarBase64?: string | null;
  avatarMime?: string | null;
}): Promise<UserProfile> {
  try {
    return await apiFetch<UserProfile>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } catch (err: unknown) {
    if (!isUnauthorizedApiError(err)) {
      throw err;
    }
    const token = await refreshAccessToken();
    if (!token) {
      throw err;
    }
    return await apiFetch<UserProfile>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }
}

export async function requestEmailChange(newEmail: string): Promise<void> {
  return apiFetch<void>("/auth/email-change/request", {
    method: "POST",
    body: JSON.stringify({ newEmail }),
  });
}

export async function confirmEmailChange(payload: { newEmail: string; code: string }): Promise<void> {
  return apiFetch<void>("/auth/email-change/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(payload: { password: string }): Promise<void> {
  const executeDelete = () =>
    apiFetch<void>("/auth/account/delete", {
      method: "POST",
      body: JSON.stringify(payload),
    });

  try {
    await executeDelete();
    clearAccessToken();
    return;
  } catch (err: unknown) {
    if (!isUnauthorizedApiError(err)) {
      throw err;
    }
  }

  const token = await refreshAccessToken();
  if (!token) {
    throw new ApiError("Unauthorized", { status: 401 });
  }

  await executeDelete();
  clearAccessToken();
}

export async function joinEnterpriseByCode(payload: { enterpriseCode: string }): Promise<void> {
  const executeJoin = () =>
    apiFetch<void>("/auth/enterprise/join", {
      method: "POST",
      body: JSON.stringify(payload),
    });

  try {
    await executeJoin();
    return;
  } catch (err: unknown) {
    if (!isUnauthorizedApiError(err)) {
      throw err;
    }
  }

  const token = await refreshAccessToken();
  if (!token) {
    throw new ApiError("Unauthorized", { status: 401 });
  }

  await executeJoin();
}

export async function leaveEnterprise(): Promise<void> {
  const executeLeave = () =>
    apiFetch<void>("/auth/enterprise/leave", {
      method: "POST",
    });

  try {
    await executeLeave();
    return;
  } catch (err: unknown) {
    if (!isUnauthorizedApiError(err)) {
      throw err;
    }
  }

  const token = await refreshAccessToken();
  if (!token) {
    throw new ApiError("Unauthorized", { status: 401 });
  }

  await executeLeave();
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  } finally {
    clearAccessToken();
  }
}
