/* eslint-disable max-lines-per-function, max-statements, complexity */
import argon2 from "argon2";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "../shared/db.js";
import { recordAuditLog } from "../features/audit/service.js";
import { randomBytes, createHash, randomInt } from "crypto";
import { sendEmail } from "../shared/email.js";

const accessSecret = process.env.JWT_ACCESS_SECRET || "";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "";
const accessTtl = process.env.JWT_ACCESS_TTL || "900s";
const refreshTtl = process.env.JWT_REFRESH_TTL || "30d";
const accessExpiresIn = accessTtl as NonNullable<SignOptions["expiresIn"]>;
const refreshExpiresIn = refreshTtl as NonNullable<SignOptions["expiresIn"]>;
const resetTtl = process.env.PASSWORD_RESET_TTL || "1h";
const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const resetDebug = process.env.PASSWORD_RESET_DEBUG === "true";
const emailChangeTtl = process.env.EMAIL_CHANGE_TTL || "15m";
const REMOVED_USERS_ENTERPRISE_CODE = (process.env.REMOVED_USERS_ENTERPRISE_CODE ?? "UNASSIGNED").toUpperCase();
const REMOVED_USERS_ENTERPRISE_NAME = process.env.REMOVED_USERS_ENTERPRISE_NAME ?? "Unassigned";
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "admin@kcl.ac.uk").toLowerCase();

type User = { id: number; email: string; role: Role };
type TokenPayload = { sub: number; email: string; admin?: boolean };
type EnterpriseAdminInviteTokenRecord = {
  id: number;
  enterpriseId: string;
  email: string;
  revoked: boolean;
  usedAt: Date | null;
  expiresAt: Date;
};
type EnterpriseAdminInviteTokenDelegate = {
  findUnique: (args: { where: { tokenHash: string } }) => Promise<EnterpriseAdminInviteTokenRecord | null>;
  update: (args: {
    where: { id: number };
    data: { revoked: boolean; usedAt: Date; acceptedByUserId: number };
  }) => Promise<unknown>;
  updateMany: (args: {
    where: {
      enterpriseId: string;
      email: string;
      revoked: false;
      usedAt: null;
      id: { not: number };
    };
    data: { revoked: true; usedAt: Date; acceptedByUserId: number };
  }) => Promise<unknown>;
};
const bootstrapAdminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
const bootstrapAdminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

function getEnterpriseAdminInviteTokenModel(client: unknown): EnterpriseAdminInviteTokenDelegate {
  const model = (client as { enterpriseAdminInviteToken?: EnterpriseAdminInviteTokenDelegate })?.enterpriseAdminInviteToken;
  if (!model) {
    throw new Error(
      "Prisma Client is out of date (missing `enterpriseAdminInviteToken` delegate). Run `npx prisma generate` in apps/api and restart the API."
    );
  }
  return model;
}

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
  if (existing) {throw { code: "EMAIL_TAKEN" };}
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

/** Accepts an enterprise-admin invite token and signs in the account. */
export async function acceptEnterpriseAdminInvite(params: {
  token: string;
  firstName?: string;
  lastName?: string;
}) {
  const normalizedToken = extractHexToken(params.token);
  const tokenHash = hashToken(normalizedToken);
  const inviteModel = getEnterpriseAdminInviteTokenModel(prisma);
  const invite = await inviteModel.findUnique({ where: { tokenHash } });
  if (!invite) {throw { code: "INVALID_ENTERPRISE_ADMIN_INVITE" };}
  if (invite.revoked || invite.usedAt) {throw { code: "USED_ENTERPRISE_ADMIN_INVITE" };}

  const now = new Date();
  if (invite.expiresAt < now) {throw { code: "EXPIRED_ENTERPRISE_ADMIN_INVITE" };}

  const trimmedFirstName = params.firstName?.trim();
  const trimmedLastName = params.lastName?.trim();
  const firstName = trimmedFirstName && trimmedFirstName.length > 0 ? trimmedFirstName : undefined;
  const lastName = trimmedLastName && trimmedLastName.length > 0 ? trimmedLastName : undefined;

  const user = await prisma.$transaction(async (tx) => {
    const txInviteModel = getEnterpriseAdminInviteTokenModel(tx);
    const existing = await tx.user.findUnique({
      where: { enterpriseId_email: { enterpriseId: invite.enterpriseId, email: invite.email } },
    });
    const crossEnterpriseExisting = existing
      ? null
      : await tx.user.findFirst({
        where: {
          email: invite.email,
          enterpriseId: { not: invite.enterpriseId },
        },
        select: {
          id: true,
          enterpriseId: true,
          enterprise: { select: { code: true } },
        },
      });
    const isHoldingEnterpriseAccount =
      crossEnterpriseExisting?.enterprise?.code?.toUpperCase() === REMOVED_USERS_ENTERPRISE_CODE;
    if (crossEnterpriseExisting && !isHoldingEnterpriseAccount) {
      throw { code: "EMAIL_ALREADY_USED_IN_OTHER_ENTERPRISE" };
    }

    const acceptedUser = existing
      ? await tx.user.update({
        where: { id: existing.id },
        data: {
          role: "ENTERPRISE_ADMIN",
          active: true,
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
        },
      })
      : crossEnterpriseExisting
        ? await tx.user.update({
          where: { id: crossEnterpriseExisting.id },
          data: {
            enterpriseId: invite.enterpriseId,
            blockedEnterpriseId: null,
            role: "ENTERPRISE_ADMIN",
            active: true,
            ...(firstName !== undefined ? { firstName } : {}),
            ...(lastName !== undefined ? { lastName } : {}),
          },
        })
      : await tx.user.create({
        data: {
          enterpriseId: invite.enterpriseId,
          email: invite.email,
          firstName: firstName ?? "",
          lastName: lastName ?? "",
          passwordHash: await argon2.hash(randomBytes(32).toString("hex")),
          role: "ENTERPRISE_ADMIN",
        },
      });

    await txInviteModel.update({
      where: { id: invite.id },
      data: {
        revoked: true,
        usedAt: now,
        acceptedByUserId: acceptedUser.id,
      },
    });
    await txInviteModel.updateMany({
      where: {
        enterpriseId: invite.enterpriseId,
        email: invite.email,
        revoked: false,
        usedAt: null,
        id: { not: invite.id },
      },
      data: {
        revoked: true,
        usedAt: now,
        acceptedByUserId: acceptedUser.id,
      },
    });
    return acceptedUser;
  });

  return issueTokens({ id: user.id, email: user.email, role: user.role });
}

/** Authenticates a login. */
export async function login(
  data: { email: string; password: string },
  meta: { ip?: string | null; userAgent?: string | null } = {}
) {
  const emailInput = (data.email ?? "").toLowerCase();
  const emailMatchCount = await prisma.user.count({ where: { email: emailInput } });
  if (emailMatchCount > 1) {throw { code: "AMBIGUOUS_EMAIL_ACCOUNT" };}
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

  if (!user || !user.passwordHash) {throw { code: "INVALID_CREDENTIALS" };}
  if (user.active === false) {throw { code: "ACCOUNT_SUSPENDED" };}

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

  if (!ok) {throw { code: "INVALID_CREDENTIALS" };}

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
  let payload: TokenPayload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw { code: "INVALID_REFRESH_TOKEN" };
  }
  const valid = await validateRefreshToken(payload.sub, refreshToken);
  if (!valid) {throw { code: "INVALID_REFRESH_TOKEN" };}
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {throw { code: "INVALID_REFRESH_TOKEN" };}
  if (user.active === false) {throw { code: "ACCOUNT_SUSPENDED" };}
  const tokens = await issueTokens({ id: user.id, email: user.email, role: user.role });
  return tokens;
}

/** Logs out the current session. */
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

/** Requests the password reset. */
export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase();
  const emailMatchCount = await prisma.user.count({ where: { email: normalizedEmail } });
  if (emailMatchCount !== 1) {return;}
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });
  if (!user) {return;}
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
  const firstName = user.firstName?.trim() || "there";
  const text = [
    `Hi ${firstName},`,
    "",
    "We received a request to reset your Team Feedback password.",
    `Account: ${user.email}`,
    "",
    `Reset your password: ${resetUrl}`,
    "If the link does not open, copy and paste it into your browser.",
    "",
    `For your security, this link expires in ${resetTtl} and can only be used once.`,
    "If you did not request a reset, you can ignore this email and your current password will remain unchanged.",
    "Do not share this link with anyone.",
  ].join("\\n");
  await sendEmail({ to: user.email, subject: "Reset your password", text });
}

/** Executes the reset password. */
export async function resetPassword(params: { token: string; newPassword: string }) {
  const normalizedToken = extractHexToken(params.token);
  const tokenHash = hashToken(normalizedToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) {
    if (resetDebug) {console.log("password reset token not found", { token: normalizedToken, tokenHash });}
    throw { code: "INVALID_RESET_TOKEN" };
  }
  if (record.revoked || record.usedAt) {throw { code: "USED_RESET_TOKEN" };}
  if (record.expiresAt < new Date()) {throw { code: "EXPIRED_RESET_TOKEN" };}
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

/** Returns the profile. */
export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, avatarData: true, avatarMime: true },
  });
  if (!user) {throw { code: "USER_NOT_FOUND" };}
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarBase64: user.avatarData ? Buffer.from(user.avatarData).toString("base64") : null,
    avatarMime: user.avatarMime ?? null,
  };
}

/** Updates the profile. */
export async function updateProfile(params: {
  userId: number;
  firstName?: string;
  lastName?: string;
  avatarBase64?: string | null;
  avatarMime?: string | null;
}) {
  const data: Prisma.UserUpdateInput = {};
  if (typeof params.firstName === "string") {data.firstName = params.firstName;}
  if (typeof params.lastName === "string") {data.lastName = params.lastName;}
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

/** Requests the email change. */
export async function requestEmailChange(params: { userId: number; newEmail: string }) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { enterpriseId: true },
  });
  if (!user) {throw { code: "USER_NOT_FOUND" };}

  const nextEmail = params.newEmail.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId: user.enterpriseId, email: nextEmail } },
  });
  if (existing) {throw { code: "EMAIL_TAKEN" };}
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
    "We received a request to change the email address on your Team Feedback account.",
    `New sign-in email: ${nextEmail}`,
    "",
    "Use this verification code to confirm your email change:",
    "",
    code,
    "",
    `This 4-digit code expires in ${emailChangeTtl}.`,
    "No account changes are applied until this code is entered.",
    "For privacy, this email only includes the verification code and requested sign-in address.",
    "If you did not request this change, you can ignore this email.",
  ].join("\n");
  const html = [
    "<p>We received a request to change the email address on your Team Feedback account.</p>",
    `<p><strong>New sign-in email:</strong> ${nextEmail}</p>`,
    "Use this verification code to confirm your email change:",
    "<br/><br/>",
    `<strong style="font-size:20px; letter-spacing:2px;">${code}</strong>`,
    "<br/><br/>",
    `This 4-digit code expires in ${emailChangeTtl}.`,
    "<br/><br/>",
    "No account changes are applied until this code is entered.",
    "<br/><br/>",
    "For privacy, this email only includes the verification code and requested sign-in address.",
    "<br/><br/>",
    "If you did not request this change, you can ignore this email.",
  ].join("");
  await sendEmail({ to: nextEmail, subject: "Verify your new email", text, html });
}

/** Confirms the email change. */
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
  if (!record) {throw { code: "INVALID_EMAIL_CODE" };}
  await prisma.$transaction([
    prisma.user.update({ where: { id: params.userId }, data: { email: nextEmail } }),
    prisma.emailChangeToken.updateMany({
      where: { userId: params.userId, revoked: false },
      data: { revoked: true, usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({ where: { userId: params.userId, revoked: false }, data: { revoked: true } }),
  ]);
}

/** Moves an unassigned account back into an enterprise using an enterprise code. */
export async function joinEnterpriseByCode(params: { userId: number; enterpriseCode: string }) {
  const code = params.enterpriseCode.trim().toUpperCase();
  if (!code) {
    throw { code: "ENTERPRISE_CODE_REQUIRED" };
  }
  if (code === REMOVED_USERS_ENTERPRISE_CODE) {
    throw { code: "ENTERPRISE_NOT_FOUND" };
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      blockedEnterpriseId: true,
      enterprise: { select: { code: true } },
    },
  });
  if (!user) {
    throw { code: "USER_NOT_FOUND" };
  }
  if (user.active === false) {
    throw { code: "ACCOUNT_SUSPENDED" };
  }
  const currentEnterpriseCode = (user.enterprise?.code ?? "").toUpperCase();
  if (currentEnterpriseCode !== REMOVED_USERS_ENTERPRISE_CODE) {
    throw { code: "ENTERPRISE_JOIN_NOT_ALLOWED" };
  }

  const targetEnterprise = await prisma.enterprise.findUnique({
    where: { code },
    select: { id: true, name: true },
  });
  if (!targetEnterprise) {
    throw { code: "ENTERPRISE_NOT_FOUND" };
  }
  if (user.blockedEnterpriseId && user.blockedEnterpriseId === targetEnterprise.id) {
    throw { code: "ENTERPRISE_ACCESS_BLOCKED" };
  }

  const existing = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId: targetEnterprise.id,
        email: user.email,
      },
    },
    select: { id: true, active: true },
  });
  if (existing && existing.id !== user.id) {
    if (existing.active === false) {
      throw { code: "ENTERPRISE_ACCESS_BLOCKED" };
    }
    throw { code: "EMAIL_TAKEN" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      enterpriseId: targetEnterprise.id,
      blockedEnterpriseId: user.blockedEnterpriseId ?? null,
      role: user.role === "ADMIN" ? "ADMIN" : "STUDENT",
      active: true,
    },
  });

  return {
    enterpriseId: targetEnterprise.id,
    enterpriseName: targetEnterprise.name,
  };
}

/** Moves an account out of its enterprise into the unassigned holding enterprise. */
export async function leaveEnterprise(params: { userId: number }) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      enterpriseId: true,
      enterprise: { select: { code: true } },
    },
  });
  if (!user) {
    throw { code: "USER_NOT_FOUND" };
  }
  if (user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN" || user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    throw { code: "ACCOUNT_LEAVE_FORBIDDEN" };
  }
  const currentEnterpriseCode = (user.enterprise?.code ?? "").toUpperCase();
  if (currentEnterpriseCode === REMOVED_USERS_ENTERPRISE_CODE) {
    throw { code: "ALREADY_UNASSIGNED" };
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.moduleLead.deleteMany({
      where: {
        userId: user.id,
        module: { enterpriseId: user.enterpriseId },
      },
    });
    await tx.moduleTeachingAssistant.deleteMany({
      where: {
        userId: user.id,
        module: { enterpriseId: user.enterpriseId },
      },
    });
    await tx.userModule.deleteMany({
      where: {
        enterpriseId: user.enterpriseId,
        userId: user.id,
      },
    });
    const holdingEnterpriseId = await resolveRemovedUsersEnterpriseId(tx);
    await tx.user.update({
      where: { id: user.id },
      data: {
        enterpriseId: holdingEnterpriseId,
        blockedEnterpriseId: user.enterpriseId,
        role: "STUDENT",
        active: true,
      },
    });
    return { enterpriseId: holdingEnterpriseId };
  });

  return result;
}

/** Deletes the current account after password verification. */
export async function deleteAccount(params: { userId: number; password: string }) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, passwordHash: true, role: true, enterpriseId: true },
  });
  if (!user) {
    throw { code: "USER_NOT_FOUND" };
  }
  if (user.role === "ADMIN" || user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    throw { code: "ACCOUNT_DELETE_FORBIDDEN" };
  }

  const passwordMatches = await verifyPasswordHash(user.passwordHash, params.password);
  if (!passwordMatches) {
    throw { code: "INVALID_PASSWORD" };
  }

  const removedPasswordHash = await argon2.hash(randomBytes(32).toString("hex"));
  const anonymizedEmail = buildDeletedAccountEmail(user.id);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.moduleLead.deleteMany({
      where: {
        userId: user.id,
        module: { enterpriseId: user.enterpriseId },
      },
    });
    await tx.moduleTeachingAssistant.deleteMany({
      where: {
        userId: user.id,
        module: { enterpriseId: user.enterpriseId },
      },
    });
    await tx.userModule.deleteMany({
      where: {
        enterpriseId: user.enterpriseId,
        userId: user.id,
      },
    });
    await tx.refreshToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true, usedAt: now },
    });
    await tx.emailChangeToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true, usedAt: now },
    });
    await tx.githubAccount.deleteMany({
      where: { userId: user.id },
    });

    const holdingEnterpriseId = await resolveRemovedUsersEnterpriseId(tx);
    await tx.user.update({
      where: { id: user.id },
      data: {
        enterpriseId: holdingEnterpriseId,
        blockedEnterpriseId: null,
        email: anonymizedEmail,
        firstName: "Deleted",
        lastName: "Account",
        passwordHash: removedPasswordHash,
        role: "STUDENT",
        active: false,
        avatarData: null,
        avatarMime: null,
        trelloToken: null,
        trelloMemberId: null,
      },
    });
  });
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

/** Issues a fresh access token and refresh token pair for an existing user. */
export async function issueTokensForUser(userId: number, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {throw { code: "INVALID_REFRESH_TOKEN" };}
  return issueTokens({ id: userId, email: email.toLowerCase(), role: user.role });
}

/** Validates that a refresh token belongs to the user and is still active. */
export async function validateRefreshTokenSession(userId: number, token: string) {
  return validateRefreshToken(userId, token);
}

async function verifyPasswordHash(passwordHash: string, password: string) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

function issueTokens(user: User) {
  const adminSession = user.role === "ADMIN";
  const payload: TokenPayload = { sub: user.id, email: user.email, admin: adminSession };
  const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessExpiresIn });
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn });
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

async function resolveRemovedUsersEnterpriseId(tx: Prisma.TransactionClient) {
  const enterprise = await tx.enterprise.upsert({
    where: { code: REMOVED_USERS_ENTERPRISE_CODE },
    update: {},
    create: {
      code: REMOVED_USERS_ENTERPRISE_CODE,
      name: REMOVED_USERS_ENTERPRISE_NAME,
    },
    select: { id: true },
  });
  return enterprise.id;
}

function buildDeletedAccountEmail(userId: number) {
  return `deleted+${userId}.${Date.now()}@account.invalid`;
}

async function resolveEnterpriseIdFromCode(input: string) {
  const code = input.trim().toUpperCase();
  if (!code) {throw { code: "ENTERPRISE_CODE_REQUIRED" };}
  const enterprise = await prisma.enterprise.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!enterprise) {throw { code: "ENTERPRISE_NOT_FOUND" };}
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
  for (const rt of records) {if (await argon2.verify(rt.hashedToken, token)) {return true;}}
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

  return {
    sub: parsedSub,
    email: payload.email,
    ...(typeof payload.admin === "boolean" ? { admin: payload.admin } : {}),
  };
}

/** Verifies and decodes a refresh token payload. */
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
  if (!match) {return Number(expr) * 1000;}
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "s") {return value * 1000;}
  if (unit === "m") {return value * 60 * 1000;}
  if (unit === "h") {return value * 60 * 60 * 1000;}
  return value * 24 * 60 * 60 * 1000;
}
