import { prisma } from "../../shared/db.js";

export function findActiveUserEnterpriseById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { enterpriseId: true, active: true },
  });
}

export function listFeatureFlagsByEnterprise(enterpriseId: string) {
  return prisma.featureFlag.findMany({
    where: { enterpriseId },
    orderBy: { key: "asc" },
  });
}

export function findFeatureFlagByKey(enterpriseId: string, key: string) {
  return prisma.featureFlag.findUnique({
    where: { enterpriseId_key: { enterpriseId, key } },
    select: { enabled: true },
  });
}
