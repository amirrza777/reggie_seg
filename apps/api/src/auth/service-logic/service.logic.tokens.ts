/* eslint-disable max-lines-per-function, complexity, max-depth */
import argon2 from "argon2";
import { createHash } from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import {
  accessExpiresIn,
  accessSecret,
  refreshExpiresIn,
  refreshSecret,
  refreshTtl,
} from "./service.logic.constants.js";

type User = { id: number; email: string; role: Role };
type TokenPayload = { sub: number; email: string; admin?: boolean; issuedAtSeconds?: number };

/** Issues a fresh access token and refresh token pair for an existing user. */
export async function issueTokensForUser(userId: number, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw { code: "INVALID_REFRESH_TOKEN" };
  }
  return issueTokens({ id: userId, email: email.toLowerCase(), role: user.role });
}

/** Validates that a refresh token belongs to the user and is still active. */
export async function validateRefreshTokenSession(userId: number, token: string, issuedAtSeconds?: number) {
  const tokenIssuedAtSeconds =
    typeof issuedAtSeconds === "number" && Number.isInteger(issuedAtSeconds) && issuedAtSeconds > 0
      ? issuedAtSeconds
      : verifyRefresh(token).issuedAtSeconds;
  return validateRefreshToken(userId, token, tokenIssuedAtSeconds);
}

/** Verifies and decodes a refresh token payload. */
export function verifyRefreshToken(token: string) {
  return verifyRefresh(token);
}

export async function verifyPasswordHash(passwordHash: string, password: string) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function issueTokens(user: User) {
  const adminSession = user.role === "ADMIN";
  const payload: TokenPayload = { sub: user.id, email: user.email, admin: adminSession };
  const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessExpiresIn });
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn });
  return saveRefresh(user.id, refreshToken, accessToken);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function extractHexToken(value: string) {
  const match = value.trim().match(/[a-f0-9]{64}/i);
  return (match?.[0] ?? value).toLowerCase();
}

export function addDurationToNow(expr: string) {
  const ms = parseDuration(expr);
  return new Date(Date.now() + ms);
}

async function saveRefresh(userId: number, token: string, accessToken: string) {
  const hashedToken = await argon2.hash(token);
  const expiresAt = addDurationToNow(refreshTtl);
  await prisma.refreshToken.create({ data: { userId, hashedToken, expiresAt } });
  return { accessToken, refreshToken: token };
}

async function validateRefreshToken(userId: number, token: string, issuedAtSeconds?: number) {
  const where = { userId, revoked: false, expiresAt: { gt: new Date() } } as const;
  const boundedTake = 25;

  if (typeof issuedAtSeconds === "number" && Number.isInteger(issuedAtSeconds) && issuedAtSeconds > 0) {
    const issuedAtMs = issuedAtSeconds * 1000;
    const issuedAtToleranceMs = 2 * 60 * 60 * 1000;
    const issuedAtCandidates = await prisma.refreshToken.findMany({
      where: {
        ...where,
        createdAt: {
          gte: new Date(issuedAtMs - issuedAtToleranceMs),
          lte: new Date(issuedAtMs + issuedAtToleranceMs),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    for (const rt of issuedAtCandidates) {
      if (await argon2.verify(rt.hashedToken, token)) {
        return true;
      }
    }
    if (issuedAtCandidates.length > 0) {
      return false;
    }
  }

  const records = await prisma.refreshToken.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: boundedTake,
  });
  for (const rt of records) {
    if (await argon2.verify(rt.hashedToken, token)) {
      return true;
    }
  }
  return false;
}

function verifyRefresh(token: string) {
  const decoded = jwt.verify(token, refreshSecret);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid refresh token payload");
  }

  const payload = decoded as JwtPayload & { email?: string; admin?: boolean };
  const parsedSub =
    typeof payload.sub === "number"
      ? payload.sub
      : typeof payload.sub === "string"
        ? Number.parseInt(payload.sub, 10)
        : Number.NaN;
  if (!Number.isInteger(parsedSub) || parsedSub <= 0) {
    throw new Error("Invalid refresh token subject");
  }
  if (typeof payload.email !== "string" || payload.email.length === 0) {
    throw new Error("Invalid refresh token email");
  }
  const parsedIssuedAt =
    typeof payload.iat === "number"
      ? payload.iat
      : typeof payload.iat === "string"
        ? Number.parseInt(payload.iat, 10)
        : Number.NaN;

  return {
    sub: parsedSub,
    email: payload.email,
    ...(typeof payload.admin === "boolean" ? { admin: payload.admin } : {}),
    ...(Number.isInteger(parsedIssuedAt) && parsedIssuedAt > 0 ? { issuedAtSeconds: parsedIssuedAt } : {}),
  };
}

function parseDuration(expr: string) {
  const match = /^(\d+)([smhd])$/.exec(expr);
  if (!match) {
    return Number(expr) * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "s") {
    return value * 1000;
  }
  if (unit === "m") {
    return value * 60 * 1000;
  }
  if (unit === "h") {
    return value * 60 * 60 * 1000;
  }
  return value * 24 * 60 * 60 * 1000;
}
