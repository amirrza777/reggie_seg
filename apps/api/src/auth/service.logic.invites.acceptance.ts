/* eslint-disable max-lines-per-function, complexity */
import argon2 from "argon2";
import { prisma } from "../shared/db.js";
import { REMOVED_USERS_ENTERPRISE_CODE } from "./service.logic.constants.js";
import { resolveRemovedUsersEnterpriseId } from "./service.logic.enterprise.js";
import { issueTokens } from "./service.logic.tokens.js";
import {
  assertGlobalInviteAccountEligibility,
  assertInviteExistingAccountAccess,
  assertInvitePasswordForNewAccount,
  finalizeEnterpriseInviteAcceptance,
  finalizeGlobalInviteAcceptance,
  getEnterpriseAdminInviteTokenModel,
  getGlobalAdminInviteTokenModel,
  normalizeInviteAcceptanceInput,
  resolveActiveEnterpriseAdminInvite,
  resolveActiveGlobalAdminInvite,
  resolveInviteEmailAccount,
  revokeUserSessions,
} from "./service.logic.invites.state.js";

/** Accepts an enterprise-admin invite token and signs in the account. */
export async function acceptEnterpriseAdminInvite(params: {
  token: string;
  newPassword?: string;
  firstName?: string;
  lastName?: string;
  authenticatedUserId?: number;
}) {
  const invite = await resolveActiveEnterpriseAdminInvite(params.token);
  const normalizedInput = normalizeInviteAcceptanceInput(params);

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

    const existingAccount = existing ?? crossEnterpriseExisting;
    await assertInviteExistingAccountAccess({
      tx,
      inviteEmail: invite.email,
      ...(params.authenticatedUserId ? { authenticatedUserId: params.authenticatedUserId } : {}),
      existingAccountFound: Boolean(existingAccount),
    });
    assertInvitePasswordForNewAccount({
      existingAccountFound: Boolean(existingAccount),
      ...(normalizedInput.newPassword ? { newPassword: normalizedInput.newPassword } : {}),
    });

    const acceptedUser = existing
      ? await tx.user.update({
        where: { id: existing.id },
        data: {
          role: "ENTERPRISE_ADMIN",
          active: true,
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
          },
        })
        : await tx.user.create({
          data: {
            enterpriseId: invite.enterpriseId,
            email: invite.email,
            firstName: normalizedInput.firstName ?? "",
            lastName: normalizedInput.lastName ?? "",
            passwordHash: await argon2.hash(normalizedInput.newPassword as string),
            role: "ENTERPRISE_ADMIN",
          },
        });

    await revokeUserSessions(tx, acceptedUser.id);
    await finalizeEnterpriseInviteAcceptance({
      inviteModel: txInviteModel,
      inviteId: invite.id,
      acceptedByUserId: acceptedUser.id,
      enterpriseId: invite.enterpriseId,
      email: invite.email,
    });
    return acceptedUser;
  });

  return issueTokens({ id: user.id, email: user.email, role: user.role });
}

/** Accepts a global-admin invite token and signs in the account. */
export async function acceptGlobalAdminInvite(params: {
  token: string;
  newPassword?: string;
  firstName?: string;
  lastName?: string;
  authenticatedUserId?: number;
}) {
  const invite = await resolveActiveGlobalAdminInvite(params.token);
  const normalizedInput = normalizeInviteAcceptanceInput(params);

  const user = await prisma.$transaction(async (tx) => {
    const txInviteModel = getGlobalAdminInviteTokenModel(tx);
    const account = await resolveInviteEmailAccount(invite.email, tx);
    const existing = account.existing;
    assertGlobalInviteAccountEligibility(existing);
    await assertInviteExistingAccountAccess({
      tx,
      inviteEmail: invite.email,
      ...(params.authenticatedUserId ? { authenticatedUserId: params.authenticatedUserId } : {}),
      existingAccountFound: account.mode === "existing_account",
    });
    assertInvitePasswordForNewAccount({
      existingAccountFound: account.mode === "existing_account",
      ...(normalizedInput.newPassword ? { newPassword: normalizedInput.newPassword } : {}),
    });

    const acceptedUser = existing
      ? await tx.user.update({
        where: { id: existing.id },
        data: {
          role: "ADMIN",
          active: true,
        },
      })
      : await tx.user.create({
        data: {
          enterpriseId: await resolveRemovedUsersEnterpriseId(tx),
          email: invite.email,
          firstName: normalizedInput.firstName ?? "",
          lastName: normalizedInput.lastName ?? "",
          passwordHash: await argon2.hash(normalizedInput.newPassword as string),
          role: "ADMIN",
        },
      });

    await revokeUserSessions(tx, acceptedUser.id);
    await finalizeGlobalInviteAcceptance({
      inviteModel: txInviteModel,
      inviteId: invite.id,
      acceptedByUserId: acceptedUser.id,
      email: invite.email,
    });
    return acceptedUser;
  });

  return issueTokens({ id: user.id, email: user.email, role: user.role });
}
