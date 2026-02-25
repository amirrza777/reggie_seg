import argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { prisma } from "../shared/db.js";
import { recordAuditLog } from "../features/audit/service.js";
import { randomBytes, createHash, randomInt } from "crypto";
import { sendEmail } from "../shared/email.js";

const accessSecret = process.env.JWT_ACCESS_SECRET || "";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "";
const accessTtl = process.env.JWT_ACCESS_TTL || "900s";
const refreshTtl = process.env.JWT_REFRESH_TTL || "30d";
const resetTtl = process.env.PASSWORD_RESET_TTL || "1h";
const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const resetDebug = process.env.PASSWORD_RESET_DEBUG === "true";
const emailChangeTtl = process.env.EMAIL_CHANGE_TTL || "15m";

type User = { id: number; email: string; role: Role };
type TokenPayload = { sub: number; email: string; admin?: boolean };
const bootstrapAdminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
const bootstrapAdminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

type NewUserRole = Extract<Role, "STUDENT" | "STAFF">;

export async function signUp(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: NewUserRole;
}) {
  const email = data.email.toLowerCase();
  const enterpriseId = await getDefaultEnterpriseId();
  const existing = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email } },
  });
  if (existing) throw { code: "EMAIL_TAKEN" };
  const passwordHash = await argon2.hash(data.password);
  const role: NewUserRole = data.role && data.role !== "ADMIN" ? data.role : "STUDENT";
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      role,
      enterpriseId,
    },
  });
  return issueTokens(user);
}

export async function login(
  data: { email: string; password: string },
  meta: { ip?: string | null; userAgent?: string | null } = {}
) {
  const emailInput = (data.email ?? "").toLowerCase();
  const enterpriseId = await getDefaultEnterpriseId();
  const user = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email: emailInput } },
  });

  if (!user && bootstrapAdminEmail && bootstrapAdminPassword) {
    if (emailInput === bootstrapAdminEmail && data.password === bootstrapAdminPassword) {
      const passwordHash = await argon2.hash(data.password);
      const created = await prisma.user.create({
        data: {
          email: emailInput,
          passwordHash,
          firstName: "Admin",
          lastName: "User",
          role: "ADMIN",
          enterpriseId,
        },
      });
      const tokens = await issueTokens(created);
      await recordAuditLog({ userId: created.id, action: "LOGIN", ...meta });
      return tokens;
    }
  }

  if (!user || !user.passwordHash) throw { code: "INVALID_CREDENTIALS" };

  const ok = await argon2.verify(user.passwordHash, data.password);
  if (!ok && bootstrapAdminEmail && bootstrapAdminPassword && emailInput === bootstrapAdminEmail) {
    if (data.password === bootstrapAdminPassword) {
      const newHash = await argon2.hash(data.password);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash, role: "ADMIN" },
      });
      const tokens = await issueTokens(updated);
      await recordAuditLog({ userId: updated.id, action: "LOGIN", ...meta });
      return tokens;
    }
  }

  if (!ok) throw { code: "INVALID_CREDENTIALS" };

  if (bootstrapAdminEmail && emailInput === bootstrapAdminEmail) {
    if (user.role !== "ADMIN") {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
      });
      const tokens = await issueTokens(updated);
      await recordAuditLog({ userId: updated.id, action: "LOGIN", ...meta });
      return tokens;
    }
    const tokens = await issueTokens(user);
    await recordAuditLog({ userId: user.id, action: "LOGIN", ...meta });
    return tokens;
  }

  const tokens = await issueTokens(user);
  await recordAuditLog({ userId: user.id, action: "LOGIN", ...meta });
  return tokens;
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefresh(refreshToken);
  const valid = await validateRefreshToken(payload.sub, refreshToken);
  if (!valid) throw new Error("invalid");
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new Error("invalid");
  const tokens = await issueTokens({ id: user.id, email: user.email, role: user.role });
  return tokens;
}

export async function logout(
  refreshToken: string,
  meta: { ip?: string | null; userAgent?: string | null } = {}
) {
  const payload = verifyRefresh(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { userId: payload.sub, revoked: false },
    data: { revoked: true },
  });
  await recordAuditLog({ userId: payload.sub, action: "LOGOUT", ...meta });
}

export async function requestPasswordReset(email: string) {
  const enterpriseId = await getDefaultEnterpriseId();
  const user = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email: email.toLowerCase() } },
  });
  if (!user) return;
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, revoked: false, expiresAt: { gt: new Date() } },
    data: { revoked: true },
  });
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = addDurationToNow(resetTtl);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  if (resetDebug) {
    console.log("password reset token issued", { email: user.email, token, tokenHash, expiresAt });
    console.log("password reset url", { resetUrl: `${appBaseUrl}/reset-password?token=${token}` });
  }
  const resetUrl = `${appBaseUrl}/reset-password?token=${token}`;
  const text = [
    "We received a request to reset your password.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    `This link expires in ${resetTtl}. If you did not request a reset, you can ignore this email.`,
  ].join("\\n");
  await sendEmail({ to: user.email, subject: "Reset your password", text });
}

export async function resetPassword(params: { token: string; newPassword: string }) {
  const normalizedToken = extractHexToken(params.token);
  const tokenHash = hashToken(normalizedToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) {
    if (resetDebug) console.log("password reset token not found", { token: normalizedToken, tokenHash });
    throw { code: "INVALID_RESET_TOKEN" };
  }
  if (record.revoked || record.usedAt) throw { code: "USED_RESET_TOKEN" };
  if (record.expiresAt < new Date()) throw { code: "EXPIRED_RESET_TOKEN" };
  const passwordHash = await argon2.hash(params.newPassword);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { revoked: true, usedAt: now } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, revoked: false },
      data: { revoked: true },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revoked: false },
      data: { revoked: true },
    }),
  ]);
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, avatarData: true, avatarMime: true },
  });
  if (!user) throw { code: "USER_NOT_FOUND" };
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarBase64: user.avatarData ? Buffer.from(user.avatarData).toString("base64") : null,
    avatarMime: user.avatarMime ?? null,
  };
}

export async function updateProfile(params: {
  userId: number;
  firstName?: string;
  lastName?: string;
  avatarBase64?: string | null;
  avatarMime?: string | null;
}) {
  const data: {
    firstName?: string;
    lastName?: string;
    avatarData?: Buffer | null;
    avatarMime?: string | null;
  } = {};
  if (typeof params.firstName === "string") data.firstName = params.firstName;
  if (typeof params.lastName === "string") data.lastName = params.lastName;
  if (params.avatarBase64 === null) {
    data.avatarData = null;
    data.avatarMime = null;
  } else if (typeof params.avatarBase64 === "string") {
    data.avatarData = Buffer.from(params.avatarBase64, "base64");
    data.avatarMime = params.avatarMime ?? null;
  }
  const user = await prisma.user.update({ where: { id: params.userId }, data });
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarBase64: user.avatarData ? Buffer.from(user.avatarData).toString("base64") : null,
    avatarMime: user.avatarMime ?? null,
  };
}

export async function requestEmailChange(params: { userId: number; newEmail: string }) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { enterpriseId: true },
  });
  if (!user) throw { code: "USER_NOT_FOUND" };

  const nextEmail = params.newEmail.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId: user.enterpriseId, email: nextEmail } },
  });
  if (existing) throw { code: "EMAIL_TAKEN" };
  await prisma.emailChangeToken.updateMany({
    where: { userId: params.userId, revoked: false, expiresAt: { gt: new Date() } },
    data: { revoked: true },
  });
  const code = randomInt(1000, 10000).toString();
  const codeHash = hashToken(code);
  const expiresAt = addDurationToNow(emailChangeTtl);
  await prisma.emailChangeToken.create({
    data: { userId: params.userId, newEmail: nextEmail, codeHash, expiresAt },
  });
  const text = [
    "Use this verification code to confirm your email change:",
    "",
    code,
    "",
    `This 4-digit code expires in ${emailChangeTtl}.`,
  ].join("\n");
  const html = [
    "Use this verification code to confirm your email change:",
    "<br/><br/>",
    `<strong style=\"font-size:20px; letter-spacing:2px;\">${code}</strong>`,
    "<br/><br/>",
    `This 4-digit code expires in ${emailChangeTtl}.`,
  ].join("");
  await sendEmail({ to: nextEmail, subject: "Verify your new email", text, html });
}

export async function confirmEmailChange(params: { userId: number; newEmail: string; code: string }) {
  const nextEmail = params.newEmail.toLowerCase();
  const codeHash = hashToken(params.code.trim());
  const record = await prisma.emailChangeToken.findFirst({
    where: {
      userId: params.userId,
      newEmail: nextEmail,
      codeHash,
      revoked: false,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) throw { code: "INVALID_EMAIL_CODE" };
  await prisma.$transaction([
    prisma.user.update({ where: { id: params.userId }, data: { email: nextEmail } }),
    prisma.emailChangeToken.updateMany({
      where: { userId: params.userId, revoked: false },
      data: { revoked: true, usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({ where: { userId: params.userId, revoked: false }, data: { revoked: true } }),
  ]);
}

export async function signUpWithProvider(params: { email: string; firstName?: string; lastName?: string; provider: string }) {
  const email = params.email.toLowerCase();
  const enterpriseId = await getDefaultEnterpriseId();
  let user = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email } },
  });
  if (!user) {
    const randomPwd = randomBytes(32).toString("hex");
    const passwordHash = await argon2.hash(randomPwd);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: params.firstName ?? "",
        lastName: params.lastName ?? "",
        role: "STUDENT",
        enterpriseId,
      },
    });
  }
  return user;
}

export async function issueTokensForUser(userId: number, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("invalid");
  return issueTokens({ id: userId, email: email.toLowerCase(), role: user.role });
}

function issueTokens(user: User) {
  const adminSession = user.role === "ADMIN";
  const payload: TokenPayload = { sub: user.id, email: user.email, admin: adminSession };
  const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessTtl });
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshTtl });
  return saveRefresh(user.id, refreshToken, accessToken);
}

async function getDefaultEnterpriseId() {
  const enterprise = await prisma.enterprise.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: { code: "DEFAULT", name: "Default Enterprise" },
    select: { id: true },
  });
  return enterprise.id;
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

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function extractHexToken(value: string) {
  const match = value.trim().match(/[a-f0-9]{64}/i);
  return (match?.[0] ?? value).toLowerCase();
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
