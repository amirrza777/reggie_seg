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
import {
  parseConfirmEmailChangeBody,
  parseForgotPasswordBody,
  parseLoginBody,
  parseRefreshTokenBody,
  parseRequestEmailChangeBody,
  parseResetPasswordBody,
  parseSignupBody,
  parseUpdateProfileBody,
} from "./controller.parsers.js";

const cookieSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
// SameSite=None is required for cross-site XHR/fetch with credentials; browsers also require Secure in that case.
const cookieSameSite: "lax" | "none" = cookieSecure ? "none" : "lax";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

/** Handles requests for signup. */
export async function signupHandler(req: Request, res: Response) {
  const parsedBody = parseSignupBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const tokens = await signUp(parsedBody.value);
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (e: any) {
    console.error("signup error", e);
    if (e.code === "ENTERPRISE_CODE_REQUIRED") return res.status(400).json({ error: "Enterprise code is required" });
    if (e.code === "ENTERPRISE_NOT_FOUND") return res.status(404).json({ error: "Enterprise code not found" });
    if (e.code === "EMAIL_TAKEN") return res.status(409).json({ error: "This email is already in use" });
    return res.status(500).json({ error: "signup failed", detail: e?.message || e?.code || String(e) });
  }
}

/** Handles requests for login. */
export async function loginHandler(req: Request, res: Response) {
  const parsedBody = parseLoginBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
  try {
    const meta = {
      userAgent: req.get("user-agent") ?? null,
      ...(typeof req.ip === "string" && req.ip.length > 0 ? { ip: req.ip } : {}),
    };
    const tokens = await login(parsedBody.value, meta);
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (e: any) {
    console.error("login error", e);
    if (e.code === "INVALID_CREDENTIALS") return res.status(401).json({ error: "Invalid credentials" });
    if (e.code === "ACCOUNT_SUSPENDED") return res.status(403).json({ error: "Account suspended" });
    return res.status(500).json({ error: "login failed", detail: e?.message || e?.code || String(e) });
  }
}

/** Handles requests for refresh. */
export async function refreshHandler(req: Request, res: Response) {
  const parsedBody = parseRefreshTokenBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  const token = req.cookies?.refresh_token || parsedBody.value.refreshToken;
  if (!token) return res.status(400).json({ error: "refresh token missing" });
  try {
    const tokens = await refreshTokens(token);
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (e: any) {
    if (e.code === "ACCOUNT_SUSPENDED") return res.status(403).json({ error: "Account suspended" });
    if (e.code === "INVALID_REFRESH_TOKEN") {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "invalid refresh token" });
    }
    console.error("refresh error", e);
    clearRefreshCookie(res);
    return res.status(401).json({ error: "invalid refresh token", detail: e?.message || e?.code || String(e) });
  }
}

/** Handles requests for logout. */
export async function logoutHandler(req: Request, res: Response) {
  const parsedBody = parseRefreshTokenBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  const token = req.cookies?.refresh_token || parsedBody.value.refreshToken;
  if (token) {
    try {
      const meta = {
        userAgent: req.get("user-agent") ?? null,
        ...(typeof req.ip === "string" && req.ip.length > 0 ? { ip: req.ip } : {}),
      };
      await logout(token, meta);
    } catch {
      // Token may already be expired/revoked; clear cookie and continue logout.
    }
  }
  clearRefreshCookie(res);
  return res.json({ success: true });
}

/** Handles requests for forgot password. */
export async function forgotPasswordHandler(req: Request, res: Response) {
  const parsedBody = parseForgotPasswordBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
  try {
    await requestPasswordReset(parsedBody.value.email);
    return res.json({ success: true });
  } catch (e: any) {
    console.error("forgot password error", e);
    return res.status(500).json({ error: "forgot password failed", detail: e?.message || e?.code || String(e) });
  }
}

/** Handles requests for reset password. */
export async function resetPasswordHandler(req: Request, res: Response) {
  const parsedBody = parseResetPasswordBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
  try {
    await resetPassword(parsedBody.value);
    return res.json({ success: true });
  } catch (e: any) {
    console.error("reset password error", e);
    if (e.code === "INVALID_RESET_TOKEN") return res.status(400).json({ error: "Invalid reset token" });
    if (e.code === "USED_RESET_TOKEN") return res.status(400).json({ error: "Reset token has already been used" });
    if (e.code === "EXPIRED_RESET_TOKEN") return res.status(400).json({ error: "Reset token has expired" });
    return res.status(500).json({ error: "reset password failed", detail: e?.message || e?.code || String(e) });
  }
}

/** Handles requests for update profile. */
export async function updateProfileHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const parsedBody = parseUpdateProfileBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
  try {
    const profile = await updateProfile({ userId, ...parsedBody.value });
    return res.json(profile);
  } catch (e: any) {
    console.error("update profile error", e);
    return res.status(500).json({ error: "update profile failed", detail: e?.message || e?.code || String(e) });
  }
}

/** Handles requests for request email change. */
export async function requestEmailChangeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const parsedBody = parseRequestEmailChangeBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
  try {
    await requestEmailChange({ userId, newEmail: parsedBody.value.newEmail });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("email change request error", e);
    if (e.code === "EMAIL_TAKEN") return res.status(409).json({ error: "Email already in use" });
    return res.status(500).json({ error: "email change request failed", detail: e?.message || e?.code || String(e) });
  }
}

/** Handles requests for confirm email change. */
export async function confirmEmailChangeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const parsedBody = parseConfirmEmailChangeBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
  try {
    await confirmEmailChange({ userId, ...parsedBody.value });
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

function clearRefreshCookie(res: Response) {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: "/",
    domain: cookieDomain,
  });
}

/** Handles requests for me. */
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        active: true,
        _count: {
          select: {
            moduleLeads: true,
            moduleTeachingAssistants: true,
          },
        },
      },
    });
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (user.active === false) {
      await prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } });
      return res.status(403).json({ error: "Account is suspended" });
    }

    const role = user.role;
    const hasModuleStaffAssignments =
      (user._count?.moduleLeads ?? 0) > 0 || (user._count?.moduleTeachingAssistants ?? 0) > 0;
    const isStaff = role !== "STUDENT" || hasModuleStaffAssignments;
    const isEnterpriseAdmin = role === "ENTERPRISE_ADMIN";
    const isAdmin = role === "ADMIN";

    const profile = await getProfile(user.id); // includes avatar fields

    return res.json({
      ...profile,
      isStaff,
      isAdmin,
      isEnterpriseAdmin,
      role,
      active: user.active ?? true,
    });
  } catch (err) {
    console.error("meHandler error", err);
    return res.status(401).json({ error: "Not authenticated" });
  }
}
