import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { prisma } from "../shared/db.js";
import { randomBytes } from "crypto";

const accessSecret = process.env.JWT_ACCESS_SECRET || "";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "";
const accessTtl = process.env.JWT_ACCESS_TTL || "900s";
const refreshTtl = process.env.JWT_REFRESH_TTL || "30d";

type User = { id: number; email: string };
type TokenPayload = { sub: number; email: string; admin?: boolean };
const bootstrapAdminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
const bootstrapAdminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

export async function signUp(data: { email: string; password: string; firstName?: string; lastName?: string }) {
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { code: "EMAIL_TAKEN" };
  const passwordHash = await argon2.hash(data.password);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName: data.firstName ?? "", lastName: data.lastName ?? "" },
  });
  return issueTokens(user, Boolean(user.isAdmin));
}

export async function login(data: { email: string; password: string }) {
  const emailInput = (data.email ?? "").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: emailInput } });

  if (!user && bootstrapAdminEmail && bootstrapAdminPassword) {
    if (emailInput === bootstrapAdminEmail && data.password === bootstrapAdminPassword) {
      const passwordHash = await argon2.hash(data.password);
      const created = await prisma.user.create({
        data: {
          email: emailInput,
          passwordHash,
          firstName: "Admin",
          lastName: "User",
          isStaff: true,
          isAdmin: true,
        },
      });
      return issueTokens(created, true);
    }
  }

  if (!user || !user.passwordHash) throw { code: "INVALID_CREDENTIALS" };

  const ok = await argon2.verify(user.passwordHash, data.password);
  if (!ok && bootstrapAdminEmail && bootstrapAdminPassword && emailInput === bootstrapAdminEmail) {
    if (data.password === bootstrapAdminPassword) {
      const newHash = await argon2.hash(data.password);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash, isAdmin: true, isStaff: true },
      });
      return issueTokens(updated, true);
    }
  }

  if (!ok) throw { code: "INVALID_CREDENTIALS" };

  if (bootstrapAdminEmail && emailInput === bootstrapAdminEmail) {
    if (!user.isAdmin || !user.isStaff) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true, isStaff: true },
      });
      return issueTokens(updated, true);
    }
    return issueTokens(user, true);
  }

  return issueTokens(user, user.isAdmin);
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefresh(refreshToken);
  const valid = await validateRefreshToken(payload.sub, refreshToken);
  if (!valid) throw new Error("invalid");
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new Error("invalid");
  return issueTokens({ id: user.id, email: user.email }, Boolean(user.isAdmin));
}

export async function logout(refreshToken: string) {
  const payload = verifyRefresh(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { userId: payload.sub, revoked: false },
    data: { revoked: true },
  });
}

export async function signUpWithProvider(params: { email: string; firstName?: string; lastName?: string; provider: string }) {
  const email = params.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const randomPwd = randomBytes(32).toString("hex");
    const passwordHash = await argon2.hash(randomPwd);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: params.firstName ?? "",
        lastName: params.lastName ?? "",
        isAdmin: false,
      },
    });
  }
  return user;
}

export async function issueTokensForUser(userId: number, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return issueTokens({ id: userId, email: email.toLowerCase() }, Boolean(user?.isAdmin));
}

function issueTokens(user: User, adminSession: boolean) {
  const payload: TokenPayload = { sub: user.id, email: user.email, admin: adminSession };
  const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessTtl });
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshTtl });
  return saveRefresh(user.id, refreshToken, accessToken);
}

async function saveRefresh(userId: number, token: string, accessToken: string) {
  const hashedToken = await argon2.hash(token);
  const expiresAt = addDurationToNow(refreshTtl);
  await prisma.refreshToken.create({ data: { userId, hashedToken, expiresAt } });
  return { accessToken, refreshToken: token };
}

async function validateRefreshToken(userId: number, token: string) {
  const records = await prisma.refreshToken.findMany({
    where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  for (const rt of records) if (await argon2.verify(rt.hashedToken, token)) return true;
  return false;
}

function verifyRefresh(token: string) {
  return jwt.verify(token, refreshSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return verifyRefresh(token);
}

function addDurationToNow(expr: string) {
  const ms = parseDuration(expr);
  return new Date(Date.now() + ms);
}

function parseDuration(expr: string) {
  const match = /^(\d+)([smhd])$/.exec(expr);
  if (!match) return Number(expr) * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}