import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET || "";

type DecodedAuthUser = { sub: number; email: string; admin?: boolean };
export type AuthUser = Express.User & { sub?: number; email?: string; admin?: boolean };

export type AuthRequest = Request & { user?: AuthUser | undefined };

function decodeAuthPayload(token: string): DecodedAuthUser {
  const decoded = jwt.verify(token, accessSecret);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const payload = decoded as JwtPayload & { email?: string; admin?: boolean };
  const parsedSub =
    typeof payload.sub === "number"
      ? payload.sub
      : typeof payload.sub === "string"
        ? Number.parseInt(payload.sub, 10)
        : Number.NaN;

  if (!Number.isInteger(parsedSub) || parsedSub <= 0) {
    throw new Error("Invalid token subject");
  }
  if (typeof payload.email !== "string" || payload.email.length === 0) {
    throw new Error("Invalid token email");
  }

  return {
    sub: parsedSub,
    email: payload.email,
    ...(typeof payload.admin === "boolean" ? { admin: payload.admin } : {}),
  };
}

/** Ensures the current request is authenticated before continuing. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing access token" });
  try {
    const payload = decodeAuthPayload(token);
    (req as AuthRequest).user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid access token" });
  }
}

/**
 * Optional auth — sets req.user from a valid Bearer token but never returns 401.
 * Use on routes that have their own auth fallback (e.g. /me which falls back to refresh_token).
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = decodeAuthPayload(token);
      (req as AuthRequest).user = payload;
    } catch {
      // Invalid or expired token — leave req.user unset and let the handler decide
    }
  }
  return next();
}
