import type { Request, Response } from "express";
import { signUp, login, refreshTokens, logout, verifyRefreshToken } from "./service.js";
import { prisma } from "../shared/db.js";

export async function signupHandler(req: Request, res: Response) {
  const { email, password, firstName, lastName } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and Password required" });
  try {
    const tokens = await signUp({ email, password, firstName, lastName });
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

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export async function meHandler(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const isAdminSession = Boolean(payload.admin) && user.isAdmin;
    const role = isAdminSession ? "ADMIN" : user.isStaff ? "STAFF" : "STUDENT";

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isStaff: user.isStaff,
      isAdmin: user.isAdmin,
      role,
      active: true,
    });
  } catch (err) {
    console.error("meHandler error", err);
    return res.status(401).json({ error: "Not authenticated" });
  }
}