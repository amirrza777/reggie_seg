/* eslint-disable max-lines-per-function */
import type { Prisma } from "@prisma/client";
import { prisma } from "../shared/db.js";
import { REMOVED_USERS_ENTERPRISE_CODE } from "./service.logic.constants.js";
import { extractHexToken, hashToken } from "./service.logic.tokens.js";

type EnterpriseAdminInviteTokenRecord = {
  id: number;
  enterpriseId: string;
  email: string;
  revoked: boolean;
  usedAt: Date | null;
  expiresAt: Date;
};

type GlobalAdminInviteTokenRecord = {
  id: number;
  email: string;
  revoked: boolean;
  usedAt: Date | null;
  expiresAt: Date;
};

export type EnterpriseAdminInviteTokenDelegate = {
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

export type GlobalAdminInviteTokenDelegate = {
  findUnique: (args: { where: { tokenHash: string } }) => Promise<GlobalAdminInviteTokenRecord | null>;
  update: (args: {
    where: { id: number };
    data: { revoked: boolean; usedAt: Date; acceptedByUserId: number };
  }) => Promise<unknown>;
  updateMany: (args: {
    where: {
      email: string;
      revoked: false;
      usedAt: null;
      id: { not: number };
    };
    data: { revoked: true; usedAt: Date; acceptedByUserId: number };
  }) => Promise<unknown>;
};

export type NormalizedInviteAcceptanceInput = {
  firstName?: string;
  lastName?: string;
  newPassword?: string;
};

export type InviteEmailAccount = {
  id: number;
  email: string;
  enterpriseCode: string | null;
};

export function getEnterpriseAdminInviteTokenModel(client: unknown): EnterpriseAdminInviteTokenDelegate {
  const model = (client as { enterpriseAdminInviteToken?: EnterpriseAdminInviteTokenDelegate })?.enterpriseAdminInviteToken;
  if (!model) {
    throw new Error(
      "Prisma Client is out of date (missing `enterpriseAdminInviteToken` delegate). Run `npx prisma generate` in apps/api and restart the API."
    );
  }
  return model;
}

export function getGlobalAdminInviteTokenModel(client: unknown): GlobalAdminInviteTokenDelegate {
  const model = (client as { globalAdminInviteToken?: GlobalAdminInviteTokenDelegate })?.globalAdminInviteToken;
  if (!model) {
    throw new Error(
      "Prisma Client is out of date (missing `globalAdminInviteToken` delegate). Run `npx prisma generate` in apps/api and restart the API."
    );
  }
  return model;
}

export async function resolveActiveEnterpriseAdminInvite(token: string, client: unknown = prisma) {
  const normalizedToken = extractHexToken(token);
  const tokenHash = hashToken(normalizedToken);
  const inviteModel = getEnterpriseAdminInviteTokenModel(client);
  const invite = await inviteModel.findUnique({ where: { tokenHash } });
  if (!invite) {
    throw { code: "INVALID_ENTERPRISE_ADMIN_INVITE" };
  }
  if (invite.revoked || invite.usedAt) {
    throw { code: "USED_ENTERPRISE_ADMIN_INVITE" };
  }
  if (invite.expiresAt < new Date()) {
    throw { code: "EXPIRED_ENTERPRISE_ADMIN_INVITE" };
  }
  return invite;
}

export async function resolveActiveGlobalAdminInvite(token: string, client: unknown = prisma) {
  const normalizedToken = extractHexToken(token);
  const tokenHash = hashToken(normalizedToken);
  const inviteModel = getGlobalAdminInviteTokenModel(client);
  const invite = await inviteModel.findUnique({ where: { tokenHash } });
  if (!invite) {
    throw { code: "INVALID_GLOBAL_ADMIN_INVITE" };
  }
  if (invite.revoked || invite.usedAt) {
    throw { code: "USED_GLOBAL_ADMIN_INVITE" };
  }
  if (invite.expiresAt < new Date()) {
    throw { code: "EXPIRED_GLOBAL_ADMIN_INVITE" };
  }
  return invite;
}

export function normalizeInviteAcceptanceInput(params: {
  firstName?: string;
  lastName?: string;
  newPassword?: string;
}): NormalizedInviteAcceptanceInput {
  const trimmedFirstName = params.firstName?.trim();
  const trimmedLastName = params.lastName?.trim();
  const trimmedPassword = params.newPassword?.trim();
  return {
    ...(trimmedFirstName && trimmedFirstName.length > 0 ? { firstName: trimmedFirstName } : {}),
    ...(trimmedLastName && trimmedLastName.length > 0 ? { lastName: trimmedLastName } : {}),
    ...(trimmedPassword && trimmedPassword.length > 0 ? { newPassword: trimmedPassword } : {}),
  };
}

export async function assertInviteExistingAccountAccess(params: {
  tx: Prisma.TransactionClient;
  inviteEmail: string;
  authenticatedUserId?: number;
  existingAccountFound: boolean;
}) {
  if (!params.existingAccountFound) {
    return;
  }
  if (!params.authenticatedUserId) {
    throw { code: "AUTH_REQUIRED_FOR_EXISTING_ACCOUNT" };
  }
  const authenticatedUser = await params.tx.user.findUnique({
    where: { id: params.authenticatedUserId },
    select: { id: true, email: true },
  });
  if (!authenticatedUser || authenticatedUser.email.toLowerCase() !== params.inviteEmail.toLowerCase()) {
    throw { code: "INVITE_EMAIL_MISMATCH" };
  }
}

export function assertInvitePasswordForNewAccount(params: { existingAccountFound: boolean; newPassword?: string }) {
  if (!params.existingAccountFound && !params.newPassword) {
    throw { code: "PASSWORD_REQUIRED_FOR_NEW_ACCOUNT" };
  }
}

export async function revokeUserSessions(tx: Prisma.TransactionClient, userId: number) {
  await tx.refreshToken.updateMany({
    where: {
      userId,
      revoked: false,
    },
    data: {
      revoked: true,
    },
  });
}

export async function finalizeEnterpriseInviteAcceptance(params: {
  inviteModel: EnterpriseAdminInviteTokenDelegate;
  inviteId: number;
  acceptedByUserId: number;
  enterpriseId: string;
  email: string;
}) {
  const now = new Date();
  await params.inviteModel.update({
    where: { id: params.inviteId },
    data: {
      revoked: true,
      usedAt: now,
      acceptedByUserId: params.acceptedByUserId,
    },
  });
  await params.inviteModel.updateMany({
    where: {
      enterpriseId: params.enterpriseId,
      email: params.email,
      revoked: false,
      usedAt: null,
      id: { not: params.inviteId },
    },
    data: {
      revoked: true,
      usedAt: now,
      acceptedByUserId: params.acceptedByUserId,
    },
  });
}

export async function finalizeGlobalInviteAcceptance(params: {
  inviteModel: GlobalAdminInviteTokenDelegate;
  inviteId: number;
  acceptedByUserId: number;
  email: string;
}) {
  const now = new Date();
  await params.inviteModel.update({
    where: { id: params.inviteId },
    data: {
      revoked: true,
      usedAt: now,
      acceptedByUserId: params.acceptedByUserId,
    },
  });
  await params.inviteModel.updateMany({
    where: {
      email: params.email,
      revoked: false,
      usedAt: null,
      id: { not: params.inviteId },
    },
    data: {
      revoked: true,
      usedAt: now,
      acceptedByUserId: params.acceptedByUserId,
    },
  });
}

export async function resolveInviteEmailAccount(
  email: string,
  client: Pick<typeof prisma, "user"> = prisma,
): Promise<{ mode: "new_account" | "existing_account"; existing: InviteEmailAccount | null }> {
  const emailMatchCount = await client.user.count({ where: { email } });
  if (emailMatchCount > 1) {
    throw { code: "AMBIGUOUS_EMAIL_ACCOUNT" };
  }
  const existing = await client.user.findFirst({
    where: { email },
    select: { id: true, email: true, enterprise: { select: { code: true } } },
  });
  return {
    mode: existing ? "existing_account" : "new_account",
    existing: existing
      ? {
        id: existing.id,
        email: existing.email,
        enterpriseCode: existing.enterprise?.code ?? null,
      }
      : null,
  };
}

function isHoldingEnterpriseCode(code: string | null | undefined) {
  return (code ?? "").toUpperCase() === REMOVED_USERS_ENTERPRISE_CODE;
}

export function assertGlobalInviteAccountEligibility(existingAccount: InviteEmailAccount | null) {
  if (!existingAccount) {
    return;
  }
  if (!isHoldingEnterpriseCode(existingAccount.enterpriseCode)) {
    throw { code: "EMAIL_ALREADY_USED_IN_ENTERPRISE_ACCOUNT" };
  }
}

export async function getEnterpriseAdminInviteState(params: { token: string }) {
  const invite = await resolveActiveEnterpriseAdminInvite(params.token);
  const existing = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId: invite.enterpriseId, email: invite.email } },
    select: { id: true },
  });
  const crossEnterpriseExisting = existing
    ? null
    : await prisma.user.findFirst({
      where: {
        email: invite.email,
        enterpriseId: { not: invite.enterpriseId },
      },
      select: {
        id: true,
        enterprise: { select: { code: true } },
      },
    });
  const isHoldingEnterpriseAccount =
    crossEnterpriseExisting?.enterprise?.code?.toUpperCase() === REMOVED_USERS_ENTERPRISE_CODE;
  if (crossEnterpriseExisting && !isHoldingEnterpriseAccount) {
    throw { code: "EMAIL_ALREADY_USED_IN_OTHER_ENTERPRISE" };
  }
  return {
    mode: existing || crossEnterpriseExisting ? "existing_account" as const : "new_account" as const,
  };
}

export async function getGlobalAdminInviteState(params: { token: string }) {
  const invite = await resolveActiveGlobalAdminInvite(params.token);
  const account = await resolveInviteEmailAccount(invite.email);
  assertGlobalInviteAccountEligibility(account.existing);
  return {
    mode: account.mode,
  };
}
