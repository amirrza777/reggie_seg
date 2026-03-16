import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { AdminRequest } from "./types.js";
import { isSuperAdminEmail, resolveAdminUser } from "./service.js";

const refreshSecret = process.env.JWT_REFRESH_SECRET || "";

export async function ensureAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, refreshSecret) as { sub?: number; admin?: boolean };
    if (!payload?.sub) return res.status(401).json({ error: "Not authenticated" });
    if (!payload.admin) return res.status(403).json({ error: "Forbidden" });
    const adminUser = await resolveAdminUser(payload);
    if (!adminUser) return res.status(403).json({ error: "Forbidden" });
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
