/* eslint-disable max-lines-per-function */
import { randomInt } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../shared/db.js";
import { sendEmail } from "../shared/email.js";
import { emailChangeTtl } from "./service.logic.constants.js";
import { addDurationToNow, hashToken } from "./service.logic.tokens.js";

/** Returns the profile. */
export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, avatarData: true, avatarMime: true },
  });
  if (!user) {
    throw { code: "USER_NOT_FOUND" };
  }
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
  if (typeof params.firstName === "string") {
    data.firstName = params.firstName;
  }
  if (typeof params.lastName === "string") {
    data.lastName = params.lastName;
  }
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
  if (!user) {
    throw { code: "USER_NOT_FOUND" };
  }

  const nextEmail = params.newEmail.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId: user.enterpriseId, email: nextEmail } },
  });
  if (existing) {
    throw { code: "EMAIL_TAKEN" };
  }
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
  if (!record) {
    throw { code: "INVALID_EMAIL_CODE" };
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: params.userId }, data: { email: nextEmail } }),
    prisma.emailChangeToken.updateMany({
      where: { userId: params.userId, revoked: false },
      data: { revoked: true, usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({ where: { userId: params.userId, revoked: false }, data: { revoked: true } }),
  ]);
}
