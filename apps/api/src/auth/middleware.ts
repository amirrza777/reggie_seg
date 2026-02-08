import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET || "";

type AuthPayload = { sub: number; email: string };

export type AuthRequest = Request & { user?: AuthPayload };

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing access token" });
  try {
    const payload = jwt.verify(token, accessSecret) as AuthPayload;
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid access token" });
  }
}
