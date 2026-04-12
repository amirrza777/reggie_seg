/* eslint-disable max-lines-per-function */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import type { EnterpriseUser } from "./types.js";
import {
  MANAGED_USER_SELECT,
  REINSTATABLE_USER_SELECT,
  type ManagedUserRole,
  REMOVED_USERS_ENTERPRISE_CODE,
  REMOVED_USERS_ENTERPRISE_NAME,
  SUPER_ADMIN_EMAIL,
} from "./service.user-management.types.js";

export async function resolveManagedTargetUser(enterpriseUser: EnterpriseUser, targetUserId: number) {
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      enterpriseId: enterpriseUser.enterpriseId,
    },
    select: MANAGED_USER_SELECT,
  });
  if (!targetUser) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return { ok: false as const, status: 400, error: "Cannot modify super admin" };
  }
  if (targetUser.role === "ADMIN") {
    return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
  }
  return { ok: true as const, value: targetUser };
}

export async function removeUserEnterpriseAccessInTransaction(tx: Prisma.TransactionClient, enterpriseId: string, userId: number) {
  await tx.moduleLead.deleteMany({
    where: {
      userId,
      module: { enterpriseId },
    },
  });
  await tx.moduleTeachingAssistant.deleteMany({
    where: {
      userId,
      module: { enterpriseId },
    },
  });
  await tx.userModule.deleteMany({
    where: {
      enterpriseId,
      userId,
    },
  });
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

export async function tryReinstateRemovedUser(
  enterpriseUser: EnterpriseUser,
  targetUserId: number,
  roleOverride?: ManagedUserRole,
) {
  const candidate = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: REINSTATABLE_USER_SELECT,
  });
  if (!candidate) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  const candidateEnterpriseCode = candidate.enterprise?.code?.toUpperCase();
  if (candidate.email.toLowerCase() === SUPER_ADMIN_EMAIL || candidate.role === "ADMIN") {
    return { ok: false as const, status: 404, error: "User not found" };
  }

  if (candidateEnterpriseCode !== REMOVED_USERS_ENTERPRISE_CODE) {
    if (candidate.blockedEnterpriseId === enterpriseUser.enterpriseId && candidate.enterpriseId !== enterpriseUser.enterpriseId) {
      return { ok: false as const, status: 409, error: "User is in another enterprise" };
    }
    return { ok: false as const, status: 404, error: "User not found" };
  }

  const reinstated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      enterpriseId: enterpriseUser.enterpriseId,
      blockedEnterpriseId: null,
      active: true,
      role: roleOverride ?? "STUDENT",
    },
    select: MANAGED_USER_SELECT,
  });

  return { ok: true as const, value: reinstated };
}

export async function resolveRemovedUsersEnterpriseId(tx: Prisma.TransactionClient) {
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
