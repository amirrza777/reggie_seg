import { prisma } from "../../shared/db.js";

export async function isFeatureEnabled(key: string, enterpriseId?: string): Promise<boolean> {
  const enterprise = enterpriseId
    ? { id: enterpriseId }
    : await prisma.enterprise.upsert({
        where: { code: "DEFAULT" },
        update: {},
        create: { code: "DEFAULT", name: "Default Enterprise" },
        select: { id: true },
      });

  const flag = await prisma.featureFlag.findUnique({
    where: { enterpriseId_key: { enterpriseId: enterprise.id, key } },
    select: { enabled: true },
  });

  return flag?.enabled === true;
}
