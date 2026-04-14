/* eslint-disable max-lines-per-function, max-statements, complexity */
import argon2 from "argon2";
import { randomBytes } from "crypto";
import { prisma } from "../../shared/db.js";
import { sendEmail } from "../../shared/email.js";
import {
  appBaseUrl,
  REMOVED_USERS_ENTERPRISE_CODE,
  resetDebug,
  resetTtl,
  setupTtl,
  SUPER_ADMIN_EMAIL,
} from "./service.logic.constants.js";
import {
  buildDeletedAccountEmail,
  resolveRemovedUsersEnterpriseId,
} from "./service.logic.enterprise.js";
import {
  addDurationToNow,
  extractHexToken,
  hashToken,
  verifyPasswordHash,
} from "./service.logic.tokens.js";

type PasswordAccessEmailPurpose = "reset" | "setup";

function buildPasswordAccessEmail(params: {
  purpose: PasswordAccessEmailPurpose;
  firstName: string;
  email: string;
  resetUrl: string;
  ttl: string;
}) {
  const sharedLines = [
    `Account: ${params.email}`,
    "",
    `${params.purpose === "setup" ? "Set up your password" : "Reset your password"}: ${params.resetUrl}`,
    "If the link does not open, copy and paste it into your browser.",
    "",
    `For your security, this link expires in ${params.ttl} and can only be used once.`,
    params.purpose === "setup"
      ? "If you were not expecting this account, contact your enterprise administrator."
      : "If you did not request a reset, you can ignore this email and your current password will remain unchanged.",
    "Do not share this link with anyone.",
  ];

  if (params.purpose === "setup") {
    return {
      subject: "Set up your password",
      text: [
        `Hi ${params.firstName},`,
        "",
        "An account has been created for you in Team Feedback.",
        "Use the secure link below to set your password and sign in.",
        "",
        ...sharedLines,
      ].join("\n"),
    };
  }

  return {
    subject: "Reset your password",
    text: [
      `Hi ${params.firstName},`,
      "",
      "We received a request to reset your Team Feedback password.",
      ...sharedLines,
    ].join("\n"),
  };
}

async function issuePasswordAccessEmail(email: string, purpose: PasswordAccessEmailPurpose) {
  const normalizedEmail = email.toLowerCase();
  const emailMatchCount = await prisma.user.count({ where: { email: normalizedEmail } });
  if (emailMatchCount !== 1) {
    return;
  }
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });
  if (!user) {
    return;
  }
  const ttl = purpose === "setup" ? setupTtl : resetTtl;
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, revoked: false, expiresAt: { gt: new Date() } },
    data: { revoked: true },
  });
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = addDurationToNow(ttl);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  if (resetDebug) {
    console.log("password reset token issued", { email: user.email, token, tokenHash, expiresAt, purpose });
    console.log("password reset url", { resetUrl: `${appBaseUrl}/reset-password?token=${token}` });
  }
  const resetUrl = `${appBaseUrl}/reset-password?token=${token}`;
  const firstName = user.firstName?.trim() || "there";
  const message = buildPasswordAccessEmail({ purpose, firstName, email: user.email, resetUrl, ttl });
  await sendEmail({ to: user.email, subject: message.subject, text: message.text });
}

/** Requests the password reset. */
export async function requestPasswordReset(email: string) {
  await issuePasswordAccessEmail(email, "reset");
}

/** Sends a password setup email for newly created or reinstated accounts. */
export async function sendPasswordSetupEmail(email: string) {
  await issuePasswordAccessEmail(email, "setup");
}

/** Sends a confirmation email when an account receives enterprise-admin access. */
export async function sendEnterpriseAdminPromotionEmail(params: { email: string; firstName?: string }) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const firstName = params.firstName?.trim() || "there";
  const text = [
    `Hi ${firstName},`,
    "",
    "Your Team Feedback account has been granted Enterprise Admin access.",
    "",
    `Account: ${normalizedEmail}`,
    "Permissions: manage enterprise users, modules, and enterprise settings.",
    "",
    "If you were not expecting this change, contact your platform administrator.",
  ].join("\n");
  await sendEmail({
    to: normalizedEmail,
    subject: "Enterprise admin access granted",
    text,
  });
}

/** Executes the reset password. */
export async function resetPassword(params: { token: string; newPassword: string }) {
  const normalizedToken = extractHexToken(params.token);
  const tokenHash = hashToken(normalizedToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) {
    if (resetDebug) {
      console.log("password reset token not found", { token: normalizedToken, tokenHash });
    }
    throw { code: "INVALID_RESET_TOKEN" };
  }
  if (record.revoked || record.usedAt) {
    throw { code: "USED_RESET_TOKEN" };
  }
  if (record.expiresAt < new Date()) {
    throw { code: "EXPIRED_RESET_TOKEN" };
  }
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
  const isEligibleToJoin = currentEnterpriseCode === REMOVED_USERS_ENTERPRISE_CODE || currentEnterpriseCode === "DEFAULT";
  if (!isEligibleToJoin) {
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