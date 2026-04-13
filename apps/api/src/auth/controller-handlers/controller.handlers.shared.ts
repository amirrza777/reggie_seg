import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware.js";
import {
  validateRefreshTokenSession,
  verifyRefreshToken,
} from "../service.js";
import { prisma } from "../../shared/db.js";

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

export function getRequestMeta(req: Request): RequestMeta {
  const ip = typeof req.ip === "string" && req.ip.length > 0 ? req.ip : undefined;
  return {
    userAgent: req.get("user-agent") ?? null,
    ...(ip ? { ip } : {}),
  };
}

export function getErrorCode(error: unknown): string | null {
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

export function respondWithErrorDetail(res: Response, status: number, error: string, cause: unknown) {
  return res.status(status).json({ error, detail: getErrorDetail(cause) });
}

export function handleLoginError(res: Response, error: unknown) {
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

export function handleRefreshError(res: Response, error: unknown) {
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

export async function resolveAuthenticatedUserId(req: AuthRequest): Promise<number | null> {
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
    const valid =
      typeof payload.issuedAtSeconds === "number"
        ? await validateRefreshTokenSession(payload.sub, refreshToken, payload.issuedAtSeconds)
        : await validateRefreshTokenSession(payload.sub, refreshToken);
    if (!valid) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

export function findMeUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: meUserSelect,
  });
}

export function deriveRoleFlags(role: string, moduleLeadCount: number, moduleTeachingAssistantCount: number) {
  const hasModuleStaffAssignments = moduleLeadCount > 0 || moduleTeachingAssistantCount > 0;
  return {
    isStaff: role !== "STUDENT" || hasModuleStaffAssignments,
    isAdmin: role === "ADMIN",
    isEnterpriseAdmin: role === "ENTERPRISE_ADMIN",
  };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: "/",
    domain: cookieDomain,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: "/",
    domain: cookieDomain,
  });
}

export function isEnterpriseCodeUnassigned(code: string | null | undefined) {
  return (code ?? "").toUpperCase() === REMOVED_USERS_ENTERPRISE_CODE;
}
