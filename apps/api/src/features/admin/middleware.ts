import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { AdminRequest } from "./types.js";
import { validateRefreshTokenSession } from "../../auth/service.js";
import { isSuperAdminEmail, resolveAdminUser } from "./service.js";

const refreshSecret = process.env.JWT_REFRESH_SECRET || "";

function parseAdminTokenPayload(payload: string | jwt.JwtPayload): { sub: number; admin: boolean } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {return null;}
  const rawSub = payload.sub;
  const sub =
    typeof rawSub === "number"
      ? rawSub
      : typeof rawSub === "string"
        ? Number.parseInt(rawSub, 10)
        : Number.NaN;
  const admin = payload.admin;
  if (!Number.isInteger(sub) || sub <= 0) {return null;}
  if (typeof admin !== "boolean") {return null;}
  return { sub, admin };
}

export async function ensureAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.refresh_token;
  if (!token) {return res.status(401).json({ error: "Not authenticated" });}
  try {
    const verified = jwt.verify(token, refreshSecret);
    const payload = parseAdminTokenPayload(verified);
    if (!payload?.sub) {return res.status(401).json({ error: "Not authenticated" });}
    const refreshValid = await validateRefreshTokenSession(payload.sub, token);
    if (!refreshValid) {return res.status(401).json({ error: "Not authenticated" });}
    if (!payload.admin) {return res.status(403).json({ error: "Forbidden" });}
    const adminUser = await resolveAdminUser(payload);
    if (!adminUser) {return res.status(403).json({ error: "Forbidden" });}
    req.adminUser = adminUser;
    return next();
  } catch {
    return res.status(401).json({ error: "Not authenticated" });
  }
}

export function ensureSuperAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const adminUser = req.adminUser;
  if (!adminUser || !isSuperAdminEmail(adminUser.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}
