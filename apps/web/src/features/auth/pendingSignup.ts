'use client';

type PendingSignupPayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export const PENDING_SIGNUP_STORAGE_KEY = "pending_signup_payload";

export function savePendingSignup(payload: PendingSignupPayload) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, JSON.stringify(payload));
}

export function readPendingSignup(): PendingSignupPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PendingSignupPayload;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (typeof parsed.email !== "string" || typeof parsed.password !== "string") {
      return null;
    }
    return {
      email: parsed.email,
      password: parsed.password,
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : undefined,
      lastName: typeof parsed.lastName === "string" ? parsed.lastName : undefined,
    };
  } catch {
    return null;
  }
}

export function clearPendingSignup() {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
}