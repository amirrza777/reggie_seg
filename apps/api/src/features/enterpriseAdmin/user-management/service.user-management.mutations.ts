/* eslint-disable max-lines-per-function, max-statements, complexity, max-depth */
import argon2 from "argon2";
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db.js";
import { requestPasswordReset } from "../../../auth/service.js";
import { isEnterpriseAdminRole } from "../service.helpers.js";
import type { EnterpriseUser } from "../types.js";
import {
  mapManagedUser,
  resolveMembershipStatus,
} from "./service.user-management.search-helpers.js";
import {
  removeUserEnterpriseAccessInTransaction,
  resolveManagedTargetUser,
  resolveRemovedUsersEnterpriseId,
  tryReinstateRemovedUser,
} from "./service.user-management.mutation-helpers.js";
import {
  MANAGED_USER_SELECT,
  REINSTATABLE_USER_SELECT,
  REMOVED_USERS_ENTERPRISE_CODE,
  SUPER_ADMIN_EMAIL,
  type EnterpriseManagedUserCreateInput,
  type EnterpriseManagedUserUpdate,
} from "./service.user-management.types.js";

export async function updateEnterpriseUser(
  enterpriseUser: EnterpriseUser,
  targetUserId: number,
  data: EnterpriseManagedUserUpdate,
) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const targetUser = await resolveManagedTargetUser(enterpriseUser, targetUserId);
  if (!targetUser.ok) {
    if (targetUser.status === 404 && data.active === true) {
      const reinstated = await tryReinstateRemovedUser(enterpriseUser, targetUserId, data.role);
      if (reinstated.ok) {
        return { ok: true as const, value: mapManagedUser(reinstated.value) };
      }
      return reinstated;
    }
    return targetUser;
  }
  if (data.active === false && targetUser.value.id === enterpriseUser.id) {
    return { ok: false as const, status: 400, error: "You cannot remove your own enterprise access" };
  }
  if (targetUser.value.role === "ENTERPRISE_ADMIN" && enterpriseUser.role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Enterprise admin accounts can only be managed by platform admins" };
  }
  if (data.role && targetUser.value.role === "ENTERPRISE_ADMIN") {
    return { ok: false as const, status: 403, error: "Enterprise admin permissions are managed by invite flow" };
  }

  const updateData: Prisma.UserUpdateInput = {};
  if (typeof data.active === "boolean") {
    updateData.active = data.active;
  }
  if (data.role) {
    updateData.role = data.role;
  }

  if (Object.keys(updateData).length === 0) {
    return { ok: true as const, value: mapManagedUser(targetUser.value, resolveMembershipStatus(targetUser.value)) };
  }

  const updated = data.active === false
    ? await prisma.$transaction(async (tx) => {
      await removeUserEnterpriseAccessInTransaction(tx, enterpriseUser.enterpriseId, targetUserId);
      return tx.user.update({
        where: { id: targetUserId },
        data: updateData,
        select: MANAGED_USER_SELECT,
      });
    })
    : await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: MANAGED_USER_SELECT,
    });

  return { ok: true as const, value: mapManagedUser(updated, resolveMembershipStatus(updated)) };
}

export async function createEnterpriseUser(
  enterpriseUser: EnterpriseUser,
  data: EnterpriseManagedUserCreateInput,
) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  const role = data.role ?? "STUDENT";
  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();

  const inEnterprise = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId: enterpriseUser.enterpriseId,
        email: normalizedEmail,
      },
    },
    select: REINSTATABLE_USER_SELECT,
  });

  if (inEnterprise) {
    if (inEnterprise.email.toLowerCase() === SUPER_ADMIN_EMAIL || inEnterprise.role === "ADMIN") {
      return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
    }
    if (inEnterprise.role === "ENTERPRISE_ADMIN") {
      return { ok: false as const, status: 403, error: "Enterprise admin permissions are managed by invite flow" };
    }

    const updateData: Prisma.UserUpdateInput = {
      active: true,
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      role,
    };

    const updated = await prisma.user.update({
      where: { id: inEnterprise.id },
      data: updateData,
      select: MANAGED_USER_SELECT,
    });
    return { ok: true as const, value: mapManagedUser(updated, resolveMembershipStatus(updated)) };
  }

  const matchingEmailAccounts = await prisma.user.findMany({
    where: { email: normalizedEmail },
    select: REINSTATABLE_USER_SELECT,
    orderBy: [{ id: "asc" }],
  });

  if (matchingEmailAccounts.length > 0) {
    const reinstatableAccounts = matchingEmailAccounts.filter((account) => {
      const accountEnterpriseCode = account.enterprise?.code?.toUpperCase();
      return (
        accountEnterpriseCode === REMOVED_USERS_ENTERPRISE_CODE &&
        account.blockedEnterpriseId === enterpriseUser.enterpriseId
      );
    });
    const hasConflictingAccount = matchingEmailAccounts.some((account) => !reinstatableAccounts.includes(account));

    if (hasConflictingAccount || reinstatableAccounts.length !== 1) {
      return { ok: false as const, status: 409, error: "This email is already used in another enterprise" };
    }

    const [globalAccount] = reinstatableAccounts;
    if (!globalAccount) {
      return { ok: false as const, status: 409, error: "This email is already used in another enterprise" };
    }
    if (globalAccount.email.toLowerCase() === SUPER_ADMIN_EMAIL || globalAccount.role === "ADMIN") {
      return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
    }
    if (globalAccount.role === "ENTERPRISE_ADMIN") {
      return { ok: false as const, status: 403, error: "Enterprise admin permissions are managed by invite flow" };
    }

    const reinstated = await prisma.user.update({
      where: { id: globalAccount.id },
      data: {
        enterpriseId: enterpriseUser.enterpriseId,
        blockedEnterpriseId: null,
        active: true,
        role,
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
      },
      select: MANAGED_USER_SELECT,
    });
    await triggerPasswordSetupEmail(reinstated.email);

    return { ok: true as const, value: mapManagedUser(reinstated, resolveMembershipStatus(reinstated)) };
  }

  const passwordHash = await argon2.hash(randomBytes(32).toString("hex"));
  try {
    const created = await prisma.user.create({
      data: {
        enterpriseId: enterpriseUser.enterpriseId,
        email: normalizedEmail,
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        role,
        passwordHash,
      },
      select: MANAGED_USER_SELECT,
    });
    await triggerPasswordSetupEmail(created.email);
    return { ok: true as const, value: mapManagedUser(created, resolveMembershipStatus(created)) };
  } catch (error) {
    const maybeCode = (error as { code?: unknown })?.code;
    if (maybeCode === "P2002") {
      return { ok: false as const, status: 409, error: "This email is already in use" };
    }
    throw error;
  }
}

async function triggerPasswordSetupEmail(email: string) {
  try {
    await requestPasswordReset(email);
  } catch (error) {
    console.error("Failed to send enterprise account password setup email.", error);
  }
}

export async function removeEnterpriseUser(enterpriseUser: EnterpriseUser, targetUserId: number) {
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const targetUser = await resolveManagedTargetUser(enterpriseUser, targetUserId);
  if (!targetUser.ok) {
    return targetUser;
  }
  if (targetUser.value.id === enterpriseUser.id) {
    return { ok: false as const, status: 400, error: "You cannot remove your own enterprise access" };
  }
  if (targetUser.value.role === "ENTERPRISE_ADMIN" && enterpriseUser.role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Enterprise admin accounts can only be managed by platform admins" };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await removeUserEnterpriseAccessInTransaction(tx, enterpriseUser.enterpriseId, targetUserId);
    const holdingEnterpriseId = await resolveRemovedUsersEnterpriseId(tx);

    return tx.user.update({
      where: { id: targetUserId },
      data: {
        enterpriseId: holdingEnterpriseId,
        blockedEnterpriseId: enterpriseUser.enterpriseId,
        role: "STUDENT",
        active: true,
      },
      select: MANAGED_USER_SELECT,
    });
  });

  return { ok: true as const, value: mapManagedUser(updated, "left") };
}
