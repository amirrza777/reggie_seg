import { prisma } from "../../shared/db.js";
import type { Prisma } from "@prisma/client";

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  enterpriseId: true,
  role: true,
  active: true,
  enterprise: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} satisfies Prisma.UserSelect;

export function findAdminUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, enterpriseId: true, role: true, active: true },
  });
}

export function countEnterpriseUsers(enterpriseId: string) {
  return prisma.user.count({ where: { enterpriseId } });
}

export function countEnterpriseModules(enterpriseId: string) {
  return prisma.module.count({ where: { enterpriseId } });
}

export function countEnterpriseTeams(enterpriseId: string) {
  return prisma.team.count({ where: { enterpriseId } });
}

export function countEnterpriseMeetings(enterpriseId: string) {
  return prisma.meeting.count({ where: { team: { enterpriseId } } });
}

export function listUsersByEnterprise(enterpriseId: string) {
  return prisma.user.findMany({
    where: { enterpriseId },
    select: ADMIN_USER_SELECT,
    orderBy: { id: "asc" },
  });
}

export function listUsers() {
  return prisma.user.findMany({
    select: ADMIN_USER_SELECT,
    orderBy: { id: "asc" },
  });
}

export function countUsersByWhere(where: Prisma.UserWhereInput) {
  return prisma.user.count({ where });
}

export function listUsersByWhere(
  where: Prisma.UserWhereInput,
  page: number,
  pageSize: number,
  orderBy?: Prisma.UserOrderByWithRelationInput[],
) {
  const offset = (page - 1) * pageSize;
  return prisma.user.findMany({
    where,
    select: ADMIN_USER_SELECT,
    orderBy: orderBy ?? [{ id: "asc" }],
    skip: offset,
    take: pageSize,
  });
}

export function findUserInEnterprise(id: number, enterpriseId: string) {
  return prisma.user.findFirst({ where: { id, enterpriseId } });
}

export function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      enterpriseId: true,
      role: true,
      active: true,
    },
  });
}

export function findUserByEnterpriseAndEmail(enterpriseId: string, email: string) {
  return prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email } },
    select: { id: true, role: true },
  });
}

export function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email },
    select: { id: true, enterpriseId: true, role: true, enterprise: { select: { code: true } } },
  });
}

export function updateUser(id: number, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data, select: ADMIN_USER_SELECT });
}

export function createEnterpriseAdminInviteToken(input: {
  enterpriseId: string;
  email: string;
  tokenHash: string;
  invitedByUserId: number;
  expiresAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const inviteTokenModel = (tx as any).enterpriseAdminInviteToken;
    if (!inviteTokenModel) {
      throw new Error(
        "Prisma Client is out of date (missing `enterpriseAdminInviteToken` delegate). Run `npx prisma generate` in apps/api and restart the API."
      );
    }

    await inviteTokenModel.updateMany({
      where: {
        enterpriseId: input.enterpriseId,
        email: input.email,
        revoked: false,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revoked: true },
    });

    return inviteTokenModel.create({
      data: {
        enterpriseId: input.enterpriseId,
        email: input.email,
        tokenHash: input.tokenHash,
        invitedByUserId: input.invitedByUserId,
        expiresAt: input.expiresAt,
      },
      select: { id: true, email: true, expiresAt: true },
    });
  });
}

export function revokeActiveRefreshTokens(userId: number) {
  return prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
}

export function listEnterprises(where: Prisma.EnterpriseWhereInput = {}) {
  return prisma.enterprise.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      createdAt: true,
      users: { select: { role: true } },
      _count: { select: { users: true, modules: true, teams: true } },
    },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });
}

export function countEnterprisesByWhere(where: Prisma.EnterpriseWhereInput) {
  return prisma.enterprise.count({ where });
}

export function listEnterprisesByWhere(where: Prisma.EnterpriseWhereInput, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return prisma.enterprise.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      createdAt: true,
      users: { select: { role: true } },
      _count: { select: { users: true, modules: true, teams: true } },
    },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    skip: offset,
    take: pageSize,
  });
}

export function listEnterpriseFuzzyCandidatesByWhere(where: Prisma.EnterpriseWhereInput, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return prisma.enterprise.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    skip: offset,
    take: pageSize,
  });
}

export function listEnterprisesByIds(ids: string[]) {
  return prisma.enterprise.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      code: true,
      name: true,
      createdAt: true,
      users: { select: { role: true } },
      _count: { select: { users: true, modules: true, teams: true } },
    },
  });
}

export function findEnterpriseByCode(code: string) {
  return prisma.enterprise.findUnique({ where: { code }, select: { id: true } });
}

export function findEnterpriseById(id: string) {
  return prisma.enterprise.findUnique({ where: { id }, select: { id: true, name: true } });
}

export function createEnterpriseWithFlags(
  name: string,
  code: string,
  defaultFlags: Array<{ key: string; label: string; enabled: boolean }>,
) {
  return prisma.$transaction(async (tx) => {
    const enterprise = await tx.enterprise.create({
      data: { name, code },
      select: { id: true, code: true, name: true, createdAt: true },
    });
    await tx.featureFlag.createMany({
      data: defaultFlags.map((flag) => ({
        enterpriseId: enterprise.id,
        key: flag.key,
        label: flag.label,
        enabled: flag.enabled,
      })),
    });
    return enterprise;
  });
}

export function findEnterpriseForDeletion(id: string) {
  return prisma.enterprise.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          users: true,
          modules: true,
          teams: true,
          auditLogs: true,
        },
      },
    },
  });
}

export function deleteEnterpriseWithDependencies(enterpriseId: string, auditLogCount: number) {
  return prisma.$transaction(async (tx) => {
    if (auditLogCount > 0) {
      await tx.auditLog.deleteMany({ where: { enterpriseId } });
    }
    await tx.auditLogIntegrity.deleteMany({ where: { enterpriseId } });
    await tx.featureFlag.deleteMany({ where: { enterpriseId } });
    await tx.enterprise.delete({ where: { id: enterpriseId } });
  });
}
