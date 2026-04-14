import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import {
  REMOVED_USERS_ENTERPRISE_CODE,
  REMOVED_USERS_ENTERPRISE_NAME,
} from "./service.logic.constants.js";

export async function getDefaultEnterpriseId() {
  const enterprise = await prisma.enterprise.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: { code: "DEFAULT", name: "Default Enterprise" },
    select: { id: true },
  });
  return enterprise.id;
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

export function buildDeletedAccountEmail(userId: number) {
  return `deleted+${userId}.${Date.now()}@account.invalid`;
}

export async function resolveEnterpriseIdFromCode(input: string) {
  const code = input.trim().toUpperCase();
  if (!code) {
    throw { code: "ENTERPRISE_CODE_REQUIRED" };
  }
  const enterprise = await prisma.enterprise.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!enterprise) {
    throw { code: "ENTERPRISE_NOT_FOUND" };
  }
  return enterprise.id;
}

export async function needsEnterpriseCodeEntry(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, enterprise: { select: { code: true } } },
  });
  return user?.role === "STUDENT" && user?.enterprise?.code === "DEFAULT";
}