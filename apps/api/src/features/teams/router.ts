import { Router } from "express";
import type { Response } from "express";
import { requireAuth } from "../../auth/middleware.js";
import type { AuthRequest } from "../../auth/middleware.js";
import { prisma } from "../../shared/db.js";

const router = Router();

async function isStaffOrAdmin(req: AuthRequest): Promise<boolean> {
  const userId = req.user?.sub;
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const role = user?.role;
  return role === "STAFF" || role === "ENTERPRISE_ADMIN" || role === "ADMIN";
}

router.patch("/:teamId/dismiss-flag", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await isStaffOrAdmin(req))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const teamId = Number(req.params.teamId);
  if (Number.isNaN(teamId)) {
    res.status(400).json({ error: "Invalid team ID" });
    return;
  }
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  await prisma.team.update({ where: { id: teamId }, data: { inactivityFlag: "NONE" } });
  res.json({ success: true });
});

export default router;
