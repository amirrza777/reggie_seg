import { prisma } from "../../shared/db.js";

export function ensureDefaultEnterprise() {
  return prisma.enterprise.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: { code: "DEFAULT", name: "Default Enterprise" },
    select: { id: true },
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
