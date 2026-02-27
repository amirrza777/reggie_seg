import { Router } from "express";
import { prisma } from "../../shared/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  // Extend to multi-enterprise instead of default if needed
  const enterprise = await prisma.enterprise.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: { code: "DEFAULT", name: "Default Enterprise" },
    select: { id: true },
  });

  const flags = await prisma.featureFlag.findMany({
    where: { enterpriseId: enterprise.id },
    orderBy: { key: "asc" },
  });

  res.json(flags);
});

export default router;
