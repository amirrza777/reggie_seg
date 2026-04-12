/* eslint-disable max-lines-per-function, max-statements, complexity */
import argon2 from "argon2";
import { randomBytes } from "crypto";
import { prisma } from "../shared/db.js";
import { recordAuditLog } from "../features/audit/service.js";
import {
  bootstrapAdminEmail,
  bootstrapAdminPassword,
} from "./service.logic.constants.js";
import {
  getDefaultEnterpriseId,
  resolveEnterpriseIdFromCode,
} from "./service.logic.enterprise.js";
import {
  issueTokens,
  validateRefreshTokenSession,
  verifyPasswordHash,
  verifyRefreshToken,
} from "./service.logic.tokens.js";

/** Registers a sign up. */
export async function signUp(data: {
  enterpriseCode: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const email = data.email.toLowerCase();
  const enterpriseId = await resolveEnterpriseIdFromCode(data.enterpriseCode);
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    throw { code: "EMAIL_TAKEN" };
  }
  const passwordHash = await argon2.hash(data.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      role: "STUDENT",
      enterpriseId,
    },
  });
  return issueTokens(user);
}

/** Authenticates a login. */
export async function login(
  data: { email: string; password: string },
  meta: { ip?: string | null; userAgent?: string | null } = {},
) {
  const emailInput = (data.email ?? "").toLowerCase();
  const emailMatchCount = await prisma.user.count({ where: { email: emailInput } });
  if (emailMatchCount > 1) {
    throw { code: "AMBIGUOUS_EMAIL_ACCOUNT" };
  }
  const user = await prisma.user.findFirst({ where: { email: emailInput } });

  if (!user && bootstrapAdminEmail && bootstrapAdminPassword) {
    if (emailInput === bootstrapAdminEmail && data.password === bootstrapAdminPassword) {
      const enterpriseId = await getDefaultEnterpriseId();
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

  if (!user || !user.passwordHash) {
    throw { code: "INVALID_CREDENTIALS" };
  }
  if (user.active === false) {
    throw { code: "ACCOUNT_SUSPENDED" };
  }

  const ok = await verifyPasswordHash(user.passwordHash, data.password);
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

  if (!ok) {
    throw { code: "INVALID_CREDENTIALS" };
  }

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

/** Refreshes the tokens. */
export async function refreshTokens(refreshToken: string) {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw { code: "INVALID_REFRESH_TOKEN" };
  }
  const valid = await validateRefreshTokenSession(payload.sub, refreshToken, payload.issuedAtSeconds);
  if (!valid) {
    throw { code: "INVALID_REFRESH_TOKEN" };
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw { code: "INVALID_REFRESH_TOKEN" };
  }
  if (user.active === false) {
    throw { code: "ACCOUNT_SUSPENDED" };
  }
  return issueTokens({ id: user.id, email: user.email, role: user.role });
}

/** Logs out the current session. */
export async function logout(
  refreshToken: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
) {
  const payload = verifyRefreshToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { userId: payload.sub, revoked: false },
    data: { revoked: true },
  });
  await recordAuditLog({ userId: payload.sub, action: "LOGOUT", ...meta });
}

/** Registers a with provider. */
export async function signUpWithProvider(params: { email: string; firstName?: string; lastName?: string; provider: string }) {
  const email = params.email.toLowerCase();
  let user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    const enterpriseId = await getDefaultEnterpriseId();
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
