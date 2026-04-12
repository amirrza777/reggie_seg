/* eslint-disable max-lines-per-function, max-statements, complexity */
import type { Request, Response } from "express";
import type { AuthRequest } from "./middleware.js";
import {
  acceptEnterpriseAdminInvite,
  acceptGlobalAdminInvite,
  getEnterpriseAdminInviteState,
  getGlobalAdminInviteState,
  login,
  logout,
  refreshTokens,
  requestPasswordReset,
  resetPassword,
  signUp,
} from "./service.js";
import {
  parseAcceptEnterpriseAdminInviteBody,
  parseEnterpriseAdminInviteTokenBody,
  parseForgotPasswordBody,
  parseLoginBody,
  parseRefreshTokenBody,
  parseResetPasswordBody,
  parseSignupBody,
} from "./controller.parsers.js";
import {
  clearRefreshCookie,
  getErrorCode,
  getRequestMeta,
  handleLoginError,
  handleRefreshError,
  respondWithErrorDetail,
  resolveAuthenticatedUserId,
  setRefreshCookie,
} from "./controller.handlers.shared.js";

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
export async function acceptEnterpriseAdminInviteHandler(req: AuthRequest, res: Response) {
  const parsedBody = parseAcceptEnterpriseAdminInviteBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const authenticatedUserId = await resolveAuthenticatedUserId(req);
    const tokens = await acceptEnterpriseAdminInvite({
      ...parsedBody.value,
      ...(authenticatedUserId ? { authenticatedUserId } : {}),
    });
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
    if (code === "AUTH_REQUIRED_FOR_EXISTING_ACCOUNT") {
      return res.status(401).json({ error: "Sign in with the invited email to continue." });
    }
    if (code === "INVITE_EMAIL_MISMATCH") {
      return res.status(403).json({ error: "This invite can only be accepted by the invited email account." });
    }
    if (code === "PASSWORD_REQUIRED_FOR_NEW_ACCOUNT") {
      return res.status(400).json({ error: "Create a password to accept this invite." });
    }
    return respondWithErrorDetail(res, 500, "accept enterprise admin invite failed", error);
  }
}

/** Handles requests for enterprise-admin invite state resolution. */
export async function getEnterpriseAdminInviteStateHandler(req: Request, res: Response) {
  const parsedBody = parseEnterpriseAdminInviteTokenBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    return res.json(await getEnterpriseAdminInviteState(parsedBody.value));
  } catch (error: unknown) {
    console.error("resolve enterprise admin invite state error", error);
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
    return respondWithErrorDetail(res, 500, "resolve enterprise admin invite state failed", error);
  }
}

/** Handles requests for global-admin invite acceptance. */
export async function acceptGlobalAdminInviteHandler(req: AuthRequest, res: Response) {
  const parsedBody = parseAcceptEnterpriseAdminInviteBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const authenticatedUserId = await resolveAuthenticatedUserId(req);
    const tokens = await acceptGlobalAdminInvite({
      ...parsedBody.value,
      ...(authenticatedUserId ? { authenticatedUserId } : {}),
    });
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ accessToken: tokens.accessToken });
  } catch (error: unknown) {
    console.error("accept global admin invite error", error);
    const code = getErrorCode(error);
    if (code === "INVALID_GLOBAL_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invalid invite token" });
    }
    if (code === "USED_GLOBAL_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invite token has already been used" });
    }
    if (code === "EXPIRED_GLOBAL_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invite token has expired" });
    }
    if (code === "AMBIGUOUS_EMAIL_ACCOUNT") {
      return res.status(409).json({ error: "Multiple accounts use this email. Contact support to consolidate access." });
    }
    if (code === "EMAIL_ALREADY_USED_IN_ENTERPRISE_ACCOUNT") {
      return res.status(409).json({ error: "This email already belongs to an enterprise account." });
    }
    if (code === "AUTH_REQUIRED_FOR_EXISTING_ACCOUNT") {
      return res.status(401).json({ error: "Sign in with the invited email to continue." });
    }
    if (code === "INVITE_EMAIL_MISMATCH") {
      return res.status(403).json({ error: "This invite can only be accepted by the invited email account." });
    }
    if (code === "PASSWORD_REQUIRED_FOR_NEW_ACCOUNT") {
      return res.status(400).json({ error: "Create a password to accept this invite." });
    }
    return respondWithErrorDetail(res, 500, "accept global admin invite failed", error);
  }
}

/** Handles requests for global-admin invite state resolution. */
export async function getGlobalAdminInviteStateHandler(req: Request, res: Response) {
  const parsedBody = parseEnterpriseAdminInviteTokenBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    return res.json(await getGlobalAdminInviteState(parsedBody.value));
  } catch (error: unknown) {
    console.error("resolve global admin invite state error", error);
    const code = getErrorCode(error);
    if (code === "INVALID_GLOBAL_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invalid invite token" });
    }
    if (code === "USED_GLOBAL_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invite token has already been used" });
    }
    if (code === "EXPIRED_GLOBAL_ADMIN_INVITE") {
      return res.status(400).json({ error: "Invite token has expired" });
    }
    if (code === "AMBIGUOUS_EMAIL_ACCOUNT") {
      return res.status(409).json({ error: "Multiple accounts use this email. Contact support to consolidate access." });
    }
    if (code === "EMAIL_ALREADY_USED_IN_ENTERPRISE_ACCOUNT") {
      return res.status(409).json({ error: "This email already belongs to an enterprise account." });
    }
    return respondWithErrorDetail(res, 500, "resolve global admin invite state failed", error);
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
