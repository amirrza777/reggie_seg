/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiFetch } from "@/shared/api/http";
import type { AuthResponse, LoginCredentials, UserProfile } from "../types";
import { setAccessToken, clearAccessToken } from "./session";

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify(credentials),
  });
  if (res.accessToken) setAccessToken(res.accessToken);
  return res;
}

export async function signup(payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: "STUDENT" | "STAFF";
}) {
  const res = await apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
  if (res.accessToken) setAccessToken(res.accessToken);
  return res;
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
    if (res.accessToken) setAccessToken(res.accessToken);
    return res.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    return await apiFetch<UserProfile>("/auth/me");
  } catch (err: any) {
    if (err?.status === 401) {
      const token = await refreshAccessToken();
      if (!token) return null;
      return await apiFetch<UserProfile>("/auth/me");
    }
    throw err;
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
  } catch (err: any) {
    if (err?.status === 401) {
      const token = await refreshAccessToken();
      if (!token) throw err;
      return await apiFetch<UserProfile>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }
    throw err;
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

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  } finally {
    clearAccessToken();
  }
}
