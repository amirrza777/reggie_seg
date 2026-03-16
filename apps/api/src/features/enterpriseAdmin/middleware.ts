import type { NextFunction, Response } from "express";
import { prisma } from "../../shared/db.js";
import type { EnterpriseRequest } from "./types.js";

/** Resolves the enterprise user. */
export async function resolveEnterpriseUser(req: EnterpriseRequest, res: Response, next: NextFunction) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, enterpriseId: true, role: true, active: true },
  });

  if (!user || user.active === false) return res.status(403).json({ error: "Forbidden" });
  if (user.role === "STUDENT") return res.status(403).json({ error: "Forbidden" });

  req.enterpriseUser = {
    id: user.id,
    enterpriseId: user.enterpriseId,
    role: user.role,
  };
  return next();
}
