import type { Request, Response } from "express";
import {
  signUp,
  login,
  refreshTokens,
  logout,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  verifyRefreshToken
} from "./service.js";
import type { AuthRequest } from "./middleware.js";
import { prisma } from "../shared/db.js";

const cookieSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
// SameSite=None is required for cross-site XHR/fetch with credentials; browsers also require Secure in that case.
const cookieSameSite: "lax" | "none" = cookieSecure ? "none" : "lax";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

export async function signupHandler(req: Request, res: Response) {
  const { email, password, firstName, lastName, role } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and Password required" });
  const normalizedRole =
    typeof role === "string"
      ? (role.toUpperCase() as "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN")
      : undefined;
  if (normalizedRole && !["STUDENT", "STAFF", "ENTERPRISE_ADMIN"].includes(normalizedRole)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const requestedRole =
    normalizedRole === "STUDENT" || normalizedRole === "STAFF" || normalizedRole === "ENTERPRISE_ADMIN"
      ? normalizedRole
      : undefined;
  try {
    const tokens = await signUp({
      email,
      password,
      firstName,
      lastName,
      role: requestedRole,
    });
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (e: any) {
    console.error("signup error", e);
    if (e.code === "EMAIL_TAKEN") return res.status(409).json({ error: "This email is already in use" });
    return res.status(500).json({ error: "signup failed", detail: e?.message || e?.code || String(e) });
  }
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and Password required" });
  try {
    const tokens = await login({ email, password });
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (e: any) {
    console.error("login error", e);
    if (e.code === "INVALID_CREDENTIALS") return res.status(401).json({ error: "Invalid credentials" });
    return res.status(500).json({ error: "login failed", detail: e?.message || e?.code || String(e) });
  }
}

export async function refreshHandler(req: Request, res: Response) {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!token) return res.status(400).json({ error: "refresh token missing" });
  try {
    const tokens = await refreshTokens(token);
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (e: any) {
    console.error("refresh error", e);
    return res.status(401).json({ error: "invalid refresh token", detail: e?.message || e?.code || String(e) });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;
  if (token) await logout(token);
  res.clearCookie("refresh_token");
  return res.json({ success: true });
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    await requestPasswordReset(email);
    return res.json({ success: true });
  } catch (e: any) {
    console.error("forgot password error", e);
    return res.status(500).json({ error: "forgot password failed", detail: e?.message || e?.code || String(e) });
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const { token, newPassword } = req.body ?? {};
  if (!token || !newPassword) return res.status(400).json({ error: "Token and newPassword required" });
  try {
    await resetPassword({ token, newPassword });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("reset password error", e);
    if (e.code === "INVALID_RESET_TOKEN") return res.status(400).json({ error: "Invalid reset token" });
    if (e.code === "USED_RESET_TOKEN") return res.status(400).json({ error: "Reset token has already been used" });
    if (e.code === "EXPIRED_RESET_TOKEN") return res.status(400).json({ error: "Reset token has expired" });
    return res.status(500).json({ error: "reset password failed", detail: e?.message || e?.code || String(e) });
  }
}

export async function updateProfileHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { firstName, lastName, avatarBase64, avatarMime } = req.body ?? {};
  try {
    const profile = await updateProfile({ userId, firstName, lastName, avatarBase64, avatarMime });
    return res.json(profile);
  } catch (e: any) {
    console.error("update profile error", e);
    return res.status(500).json({ error: "update profile failed", detail: e?.message || e?.code || String(e) });
  }
}

export async function requestEmailChangeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { newEmail } = req.body ?? {};
  if (!newEmail) return res.status(400).json({ error: "newEmail required" });
  try {
    await requestEmailChange({ userId, newEmail });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("email change request error", e);
    if (e.code === "EMAIL_TAKEN") return res.status(409).json({ error: "Email already in use" });
    return res.status(500).json({ error: "email change request failed", detail: e?.message || e?.code || String(e) });
  }
}

export async function confirmEmailChangeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { newEmail, code } = req.body ?? {};
  if (!newEmail || !code) return res.status(400).json({ error: "newEmail and code required" });
  try {
    await confirmEmailChange({ userId, newEmail, code });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("email change confirm error", e);
    if (e.code === "INVALID_EMAIL_CODE") return res.status(400).json({ error: "Invalid or expired code" });
    return res.status(500).json({ error: "email change confirm failed", detail: e?.message || e?.code || String(e) });
  }
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: "/",
    domain: cookieDomain,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export async function meHandler(req: AuthRequest, res: Response) {
  try {
    let userId = req.user?.sub ?? null;
    let refreshPayload: { sub: number; admin?: boolean } | null = null;

    if (!userId) {
      const token = req.cookies?.refresh_token;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      refreshPayload = verifyRefreshToken(token);
      userId = refreshPayload.sub;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const role = user.role;
    const isStaff = role !== "STUDENT";
    const isEnterpriseAdmin = role === "ENTERPRISE_ADMIN";
    const isAdmin = role === "ADMIN";

    const profile = await getProfile(user.id); // includes avatar fields

    return res.json({
      ...profile,
      isStaff,
      isAdmin,
      isEnterpriseAdmin,
      role,
      active: true,
    });
  } catch (err) {
    console.error("meHandler error", err);
    return res.status(401).json({ error: "Not authenticated" });
  }
}
