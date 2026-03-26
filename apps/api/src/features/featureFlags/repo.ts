import { prisma } from "../../shared/db.js";
import type { EnterpriseFeatureFlagSeed } from "./defaults.js";

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

export function ensureFeatureFlagsByEnterprise(
  enterpriseId: string,
  defaultFlags: EnterpriseFeatureFlagSeed[],
) {
  return prisma.featureFlag.createMany({
    data: defaultFlags.map((flag) => ({
      enterpriseId,
      key: flag.key,
      label: flag.label,
      enabled: flag.enabled,
    })),
    skipDuplicates: true,
  });
}
