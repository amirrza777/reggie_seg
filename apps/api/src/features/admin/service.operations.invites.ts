/* eslint-disable max-lines-per-function, max-statements, complexity */
import { randomBytes } from "crypto";
import { recordAuditLog } from "../audit/service.js";
import { sendEmail } from "../../shared/email.js";
import * as repo from "./repo.js";
import {
  appBaseUrl,
  ENTERPRISE_ADMIN_INVITE_TTL_MS,
  ENTERPRISE_INVITE_EMAIL_REGEX,
  REMOVED_USERS_ENTERPRISE_CODE,
  escapeHtml,
  hashInviteToken,
  isSuperAdminActor,
} from "./service.operations.shared.js";

export async function inviteEnterpriseAdmin(
  input: { enterpriseId: string; email: string },
  actorId?: number,
) {
  if (!actorId) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false as const, status: 400, error: "Email is required" };
  }
  if (!ENTERPRISE_INVITE_EMAIL_REGEX.test(normalizedEmail)) {
    return { ok: false as const, status: 400, error: "Email must be a valid email address" };
  }

  const enterprise = await repo.findEnterpriseById(input.enterpriseId);
  if (!enterprise) {
    return { ok: false as const, status: 404, error: "Enterprise not found" };
  }
  const enterpriseLabel = enterprise.name?.trim() || "your enterprise";

  const existingUser = await repo.findUserByEnterpriseAndEmail(input.enterpriseId, normalizedEmail);
  if (existingUser && (existingUser.role === "ADMIN" || existingUser.role === "ENTERPRISE_ADMIN")) {
    return { ok: false as const, status: 409, error: "User already has enterprise admin access" };
  }
  const allEmailMatches = await repo.listUsersByEmail(normalizedEmail);
  const crossEnterpriseMatches = allEmailMatches.filter((user) => user.enterpriseId !== input.enterpriseId);
  if (!existingUser && crossEnterpriseMatches.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "Multiple accounts use this email. Invite a different email.",
    };
  }
  if (
    crossEnterpriseMatches.some(
      (user) => (user.enterprise?.code?.toUpperCase() ?? "") !== REMOVED_USERS_ENTERPRISE_CODE,
    )
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "This email is already used in another enterprise. Invite a different email.",
    };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + ENTERPRISE_ADMIN_INVITE_TTL_MS);
  await repo.createEnterpriseAdminInviteToken({
    enterpriseId: input.enterpriseId,
    email: normalizedEmail,
    tokenHash,
    invitedByUserId: actorId,
    expiresAt,
  });

  const acceptUrl = `${appBaseUrl}/accept-enterprise-admin-invite?token=${token}`;
  const safeEnterpriseLabel = escapeHtml(enterpriseLabel);
  const safeAcceptUrl = escapeHtml(acceptUrl);
  const text = [
    "Team Feedback enterprise admin invitation",
    "",
    `Enterprise: ${enterpriseLabel}`,
    "Role: Enterprise Admin",
    "",
    "This access allows you to manage enterprise users, modules, and related settings.",
    "",
    `Accept your invite: ${acceptUrl}`,
    "",
    "This link can only be used once and expires in 7 days.",
    "You are receiving this because this email address was entered for enterprise admin access.",
    "If you were not expecting this invite, you can ignore this email.",
  ].join("\n");
  await sendEmail({
    to: normalizedEmail,
    subject: "Enterprise admin invite",
    text,
    html: `<p><strong>Team Feedback enterprise admin invitation</strong></p><p><strong>Enterprise:</strong> ${safeEnterpriseLabel}<br/><strong>Role:</strong> Enterprise Admin</p><p>This access allows you to manage enterprise users, modules, and related settings.</p><p><a href="${safeAcceptUrl}">Accept your invite</a></p><p>This link can only be used once and expires in 7 days.</p><p>You are receiving this because this email address was entered for enterprise admin access.</p><p>If you were not expecting this invite, you can ignore this email.</p>`,
  });

  await recordAuditLog({ userId: actorId, enterpriseId: input.enterpriseId, action: "USER_UPDATED" });

  return {
    ok: true as const,
    value: {
      email: normalizedEmail,
      expiresAt,
    },
  };
}

export async function inviteGlobalAdmin(
  input: { email: string },
  actor?: { id?: number; enterpriseId?: string; email?: string },
) {
  const actorId = actor?.id;
  if (!actorId) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }
  if (!isSuperAdminActor(actor)) {
    return { ok: false as const, status: 403, error: "Only the super admin can invite global admins." };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false as const, status: 400, error: "Email is required" };
  }
  if (!ENTERPRISE_INVITE_EMAIL_REGEX.test(normalizedEmail)) {
    return { ok: false as const, status: 400, error: "Email must be a valid email address" };
  }

  const existingUsers = await repo.listUsersByEmail(normalizedEmail);
  if (existingUsers.some((user) => user.role === "ADMIN")) {
    return { ok: false as const, status: 409, error: "User already has global admin access" };
  }
  if (existingUsers.length > 1) {
    return { ok: false as const, status: 409, error: "Multiple accounts use this email. Invite a different email." };
  }
  if (
    existingUsers.some((user) => (user.enterprise?.code?.toUpperCase() ?? "") !== REMOVED_USERS_ENTERPRISE_CODE)
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "This email already belongs to an enterprise account. Use a different email.",
    };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + ENTERPRISE_ADMIN_INVITE_TTL_MS);
  await repo.createGlobalAdminInviteToken({
    email: normalizedEmail,
    tokenHash,
    invitedByUserId: actorId,
    expiresAt,
  });

  const acceptUrl = `${appBaseUrl}/accept-global-admin-invite?token=${token}`;
  const safeAcceptUrl = escapeHtml(acceptUrl);
  const text = [
    "Team Feedback global admin invitation",
    "",
    "Role: Global Admin",
    "",
    "This access allows you to manage platform users, enterprises, and enterprise-level admin access.",
    "",
    `Accept your invite: ${acceptUrl}`,
    "",
    "This link can only be used once and expires in 7 days.",
    "You are receiving this because this email address was entered for global admin access.",
    "If you were not expecting this invite, you can ignore this email.",
  ].join("\n");
  await sendEmail({
    to: normalizedEmail,
    subject: "Global admin invite",
    text,
    html: `<p><strong>Team Feedback global admin invitation</strong></p><p><strong>Role:</strong> Global Admin</p><p>This access allows you to manage platform users, enterprises, and enterprise-level admin access.</p><p><a href="${safeAcceptUrl}">Accept your invite</a></p><p>This link can only be used once and expires in 7 days.</p><p>You are receiving this because this email address was entered for global admin access.</p><p>If you were not expecting this invite, you can ignore this email.</p>`,
  });

  await recordAuditLog({
    userId: actorId,
    ...(actor.enterpriseId ? { enterpriseId: actor.enterpriseId } : {}),
    action: "USER_UPDATED",
  });

  return {
    ok: true as const,
    value: {
      email: normalizedEmail,
      expiresAt,
    },
  };
}
