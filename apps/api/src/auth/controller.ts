import type { Request, Response } from "express";
import {
  acceptEnterpriseAdminInvite,
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
  deleteAccount,
  joinEnterpriseByCode,
  leaveEnterprise,
  validateRefreshTokenSession,
  verifyRefreshToken,
} from "./service.js";
import type { AuthRequest } from "./middleware.js";
import { prisma } from "../shared/db.js";
import {
  parseAcceptEnterpriseAdminInviteBody,
  parseConfirmEmailChangeBody,
  parseDeleteAccountBody,
  parseForgotPasswordBody,
  parseJoinEnterpriseBody,
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
const REMOVED_USERS_ENTERPRISE_CODE = (process.env.REMOVED_USERS_ENTERPRISE_CODE ?? "UNASSIGNED").toUpperCase();

const meUserSelect = {
  id: true,
  role: true,
  active: true,
  enterprise: { select: { name: true, code: true } },
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
  if (code === "AMBIGUOUS_EMAIL_ACCOUNT") {
    return res.status(409).json({ error: "Multiple accounts use this email. Contact support to consolidate access." });
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

async function resolveAuthenticatedUserId(req: AuthRequest): Promise<number | null> {
  const userId = req.user?.sub;
  if (userId) {
    return userId;
  }
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return null;
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const valid = await validateRefreshTokenSession(payload.sub, refreshToken);
    if (!valid) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
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

/** Handles requests for enterprise-admin invite acceptance. */
export async function acceptEnterpriseAdminInviteHandler(req: Request, res: Response) {
  const parsedBody = parseAcceptEnterpriseAdminInviteBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const tokens = await acceptEnterpriseAdminInvite(parsedBody.value);
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (error: unknown) {
    console.error("accept enterprise admin invite error", error);
    const code = getErrorCode(error);
    if (code === "INVALID_ENTERPRISE_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invalid invite token" });
    }
    if (code === "USED_ENTERPRISE_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invite token has already been used" });
    }
    if (code === "EXPIRED_ENTERPRISE_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invite token has expired" });
    }
    if (code === "EMAIL_ALREADY_USED_IN_OTHER_ENTERPRISE") {
      return res.status(409).json({ error: "This email is already used in another enterprise." });
    }
    return respondWithErrorDetail(res, 500, "accept enterprise admin invite failed", error);
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

/** Handles requests for delete account. */
export async function deleteAccountHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseDeleteAccountBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    await deleteAccount({ userId, password: parsedBody.value.password });
    clearRefreshCookie(res);
    return res.json({ success: true });
  } catch (error: unknown) {
    console.error("delete account error", error);
    const code = getErrorCode(error);
    if (code === "INVALID_PASSWORD") {
      return res.status(401).json({ error: "Invalid password" });
    }
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    if (code === "ACCOUNT_DELETE_FORBIDDEN") {
      return res.status(403).json({ error: "Account deletion is not allowed for this account" });
    }
    return respondWithErrorDetail(res, 500, "delete account failed", error);
  }
}

/** Handles requests for joining an enterprise using a code. */
export async function joinEnterpriseByCodeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseJoinEnterpriseBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const result = await joinEnterpriseByCode({ userId, enterpriseCode: parsedBody.value.enterpriseCode });
    return res.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("join enterprise by code error", error);
    const code = getErrorCode(error);
    if (code === "ENTERPRISE_CODE_REQUIRED") {
      return res.status(400).json({ error: "Enterprise code is required" });
    }
    if (code === "ENTERPRISE_NOT_FOUND") {
      return res.status(404).json({ error: "Enterprise code not found" });
    }
    if (code === "ENTERPRISE_ACCESS_BLOCKED") {
      return res.status(403).json({ error: "Your account is blocked by that enterprise. Please email your enterprise admin." });
    }
    if (code === "ENTERPRISE_JOIN_NOT_ALLOWED") {
      return res.status(403).json({ error: "Enterprise rejoin is only available when enterprise access is required." });
    }
    if (code === "ACCOUNT_SUSPENDED") {
      return res.status(403).json({ error: "Account suspended" });
    }
    if (code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "This email is already in use for that enterprise." });
    }
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    return respondWithErrorDetail(res, 500, "join enterprise failed", error);
  }
}

/** Handles requests for leaving the current enterprise. */
export async function leaveEnterpriseHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await leaveEnterprise({ userId });
    return res.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("leave enterprise error", error);
    const code = getErrorCode(error);
    if (code === "ALREADY_UNASSIGNED") {
      return res.status(400).json({ error: "This account is already unassigned from an enterprise." });
    }
    if (code === "ACCOUNT_LEAVE_FORBIDDEN") {
      return res.status(403).json({ error: "Leaving enterprise is not allowed for this account." });
    }
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    return respondWithErrorDetail(res, 500, "leave enterprise failed", error);
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
  const userId = await resolveAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
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
      isUnassigned: (user.enterprise.code ?? "").toUpperCase() === REMOVED_USERS_ENTERPRISE_CODE,
      ...roleFlags,
      role,
      active: user.active ?? true,
    });
  } catch (error) {
    console.error("meHandler error", error);
    return res.status(401).json({ error: "Not authenticated" });
  }
}
