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
  verifyRefreshToken,
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

type ErrorMetadata = { code?: unknown; message?: unknown };
type RequestMeta = { userAgent: string | null; ip?: string };

const cookieSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
// SameSite=None is required for cross-site XHR/fetch with credentials; browsers also require Secure in that case.
const cookieSameSite: "lax" | "none" = cookieSecure ? "none" : "lax";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

const meUserSelect = {
  id: true,
  role: true,
  active: true,
  enterprise: { select: { name: true } },
  _count: {
    select: {
      moduleLeads: true,
      moduleTeachingAssistants: true,
    },
  },
} as const;

function getRequestMeta(req: Request): RequestMeta {
  const ip = typeof req.ip === "string" && req.ip.length > 0 ? req.ip : undefined;
  return {
    userAgent: req.get("user-agent") ?? null,
    ...(ip ? { ip } : {}),
  };
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  const code = (error as ErrorMetadata).code;
  return typeof code === "string" ? code : null;
}

function getErrorDetail(error: unknown): string {
  if (error && typeof error === "object") {
    const message = (error as ErrorMetadata).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
    const code = (error as ErrorMetadata).code;
    if (typeof code === "string" && code.length > 0) {
      return code;
    }
  }
  return String(error);
}

function respondWithErrorDetail(res: Response, status: number, error: string, cause: unknown) {
  return res.status(status).json({ error, detail: getErrorDetail(cause) });
}

function handleLoginError(res: Response, error: unknown) {
  const code = getErrorCode(error);
  if (code === "INVALID_CREDENTIALS") {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (code === "ACCOUNT_SUSPENDED") {
    return res.status(403).json({ error: "Account suspended" });
  }
  return respondWithErrorDetail(res, 500, "login failed", error);
}

function handleRefreshError(res: Response, error: unknown) {
  const code = getErrorCode(error);
  if (code === "ACCOUNT_SUSPENDED") {
    return res.status(403).json({ error: "Account suspended" });
  }
  clearRefreshCookie(res);
  if (code === "INVALID_REFRESH_TOKEN") {
    return res.status(401).json({ error: "invalid refresh token" });
  }
  return respondWithErrorDetail(res, 401, "invalid refresh token", error);
}

function resolveAuthenticatedUserId(req: AuthRequest): number {
  const userId = req.user?.sub;
  if (userId) {
    return userId;
  }
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    throw new Error("Not authenticated");
  }
  return verifyRefreshToken(refreshToken).sub;
}

function findMeUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: meUserSelect,
  });
}

function deriveRoleFlags(role: string, moduleLeadCount: number, moduleTeachingAssistantCount: number) {
  const hasModuleStaffAssignments = moduleLeadCount > 0 || moduleTeachingAssistantCount > 0;
  return {
    isStaff: role !== "STUDENT" || hasModuleStaffAssignments,
    isAdmin: role === "ADMIN",
    isEnterpriseAdmin: role === "ENTERPRISE_ADMIN",
  };
}

/** Handles requests for signup. */
export async function signupHandler(req: Request, res: Response) {
  const parsedBody = parseSignupBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const tokens = await signUp(parsedBody.value);
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (error: unknown) {
    console.error("signup error", error);
    const code = getErrorCode(error);
    if (code === "ENTERPRISE_CODE_REQUIRED") {
      return res.status(400).json({ error: "Enterprise code is required" });
    }
    if (code === "ENTERPRISE_NOT_FOUND") {
      return res.status(404).json({ error: "Enterprise code not found" });
    }
    if (code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "This email is already in use" });
    }
    return respondWithErrorDetail(res, 500, "signup failed", error);
  }
}

/** Handles requests for login. */
export async function loginHandler(req: Request, res: Response) {
  const parsedBody = parseLoginBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const tokens = await login(parsedBody.value, getRequestMeta(req));
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (error: unknown) {
    console.error("login error", error);
    return handleLoginError(res, error);
  }
}

/** Handles requests for refresh. */
export async function refreshHandler(req: Request, res: Response) {
  const parsedBody = parseRefreshTokenBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  const token = req.cookies?.refresh_token || parsedBody.value.refreshToken;
  if (!token) {
    return res.status(400).json({ error: "refresh token missing" });
  }

  try {
    const tokens = await refreshTokens(token);
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (error: unknown) {
    const code = getErrorCode(error);
    if (code !== "ACCOUNT_SUSPENDED" && code !== "INVALID_REFRESH_TOKEN") {
      console.error("refresh error", error);
    }
    return handleRefreshError(res, error);
  }
}

/** Handles requests for logout. */
export async function logoutHandler(req: Request, res: Response) {
  const parsedBody = parseRefreshTokenBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  const token = req.cookies?.refresh_token || parsedBody.value.refreshToken;
  if (token) {
    try {
      await logout(token, getRequestMeta(req));
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
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    await requestPasswordReset(parsedBody.value.email);
    return res.json({ success: true });
  } catch (error: unknown) {
    console.error("forgot password error", error);
    return respondWithErrorDetail(res, 500, "forgot password failed", error);
  }
}

/** Handles requests for reset password. */
export async function resetPasswordHandler(req: Request, res: Response) {
  const parsedBody = parseResetPasswordBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    await resetPassword(parsedBody.value);
    return res.json({ success: true });
  } catch (error: unknown) {
    console.error("reset password error", error);
    const code = getErrorCode(error);
    if (code === "INVALID_RESET_TOKEN") {
      return res.status(400).json({ error: "Invalid reset token" });
    }
    if (code === "USED_RESET_TOKEN") {
      return res.status(400).json({ error: "Reset token has already been used" });
    }
    if (code === "EXPIRED_RESET_TOKEN") {
      return res.status(400).json({ error: "Reset token has expired" });
    }
    return respondWithErrorDetail(res, 500, "reset password failed", error);
  }
}

/** Handles requests for update profile. */
export async function updateProfileHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseUpdateProfileBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const profile = await updateProfile({ userId, ...parsedBody.value });
    return res.json(profile);
  } catch (error: unknown) {
    console.error("update profile error", error);
    return respondWithErrorDetail(res, 500, "update profile failed", error);
  }
}

/** Handles requests for request email change. */
export async function requestEmailChangeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseRequestEmailChangeBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    await requestEmailChange({ userId, newEmail: parsedBody.value.newEmail });
    return res.json({ success: true });
  } catch (error: unknown) {
    console.error("email change request error", error);
    if (getErrorCode(error) === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already in use" });
    }
    return respondWithErrorDetail(res, 500, "email change request failed", error);
  }
}

/** Handles requests for confirm email change. */
export async function confirmEmailChangeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseConfirmEmailChangeBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    await confirmEmailChange({ userId, ...parsedBody.value });
    return res.json({ success: true });
  } catch (error: unknown) {
    console.error("email change confirm error", error);
    if (getErrorCode(error) === "INVALID_EMAIL_CODE") {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    return respondWithErrorDetail(res, 500, "email change confirm failed", error);
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
    const userId = resolveAuthenticatedUserId(req);
    const user = await findMeUser(userId);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (user.active === false) {
      await prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } });
      return res.status(403).json({ error: "Account is suspended" });
    }

    const profile = await getProfile(user.id);
    const role = user.role;
    const roleFlags = deriveRoleFlags(role, user._count?.moduleLeads ?? 0, user._count?.moduleTeachingAssistants ?? 0);

    return res.json({
      ...profile,
      enterpriseName: user.enterprise.name,
      ...roleFlags,
      role,
      active: user.active ?? true,
    });
  } catch (error) {
    console.error("meHandler error", error);
    return res.status(401).json({ error: "Not authenticated" });
  }
}
