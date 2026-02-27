import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../shared/db.js";
import { listAuditLogs } from "../audit/service.js";

type UserRole = "STUDENT" | "STAFF" | "ADMIN" | "ENTERPRISE_ADMIN";

const router = Router();
const refreshSecret = process.env.JWT_REFRESH_SECRET || "";
const SUPER_ADMIN_EMAIL = "admin@kcl.ac.uk";

const ensureAdmin = async (req: any, res: any, next: any) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, refreshSecret) as { sub?: number; admin?: boolean };
    if (!payload?.sub) return res.status(401).json({ error: "Not authenticated" });
    if (!payload.admin) return res.status(403).json({ error: "Forbidden" });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

    (req as any).adminUser = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Not authenticated" });
  }
};

const isRole = (value: unknown): value is UserRole =>
  value === "STUDENT" || value === "STAFF" || value === "ADMIN" || value === "ENTERPRISE_ADMIN";

router.use(ensureAdmin);

router.get("/summary", async (req, res) => {
  const adminUser = (req as any).adminUser as { enterpriseId: string };
  const enterpriseId = adminUser.enterpriseId;
  const [users, modules, teams, meetings] = await Promise.all([
    prisma.user.count({ where: { enterpriseId } }),
    prisma.module.count({ where: { enterpriseId } }),
    prisma.team.count({ where: { enterpriseId } }),
    prisma.meeting.count({ where: { team: { enterpriseId } } }),
  ]);
  res.json({ users, modules, teams, meetings });
});

router.get("/users", async (req, res) => {
  const adminUser = (req as any).adminUser as { enterpriseId: string };
  const enterpriseId = adminUser.enterpriseId;
  const records = await prisma.user.findMany({
    where: { enterpriseId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
    orderBy: { id: "asc" },
  });
  const payload = records.map((u) => ({
    ...u,
    isStaff: u.role !== "STUDENT",
    role: u.role === "ENTERPRISE_ADMIN" ? "ADMIN" : (u.role as UserRole),
  }));
  res.json(payload);
});

router.patch("/users/:id/role", async (req, res) => {
  const id = Number(req.params.id);
  const role = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : "";
  if (!isRole(role)) return res.status(400).json({ error: "Invalid role" });
  if (role === "ENTERPRISE_ADMIN") return res.status(400).json({ error: "Role not assignable" });

  const adminUser = (req as any).adminUser as { enterpriseId: string };
  const user = await prisma.user.findFirst({ where: { id, enterpriseId: adminUser.enterpriseId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return res.status(400).json({ error: "Cannot change role for super admin" });
  }

  const updated = await prisma.user.update({ where: { id }, data: { role } });
  res.json({
    ...updated,
    isStaff: updated.role !== "STUDENT",
  });
});

router.patch("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const adminUser = (req as any).adminUser as { enterpriseId: string };
  const user = await prisma.user.findFirst({ where: { id, enterpriseId: adminUser.enterpriseId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return res.status(400).json({ error: "Cannot modify super admin" });
  }

  const nextActive = req.body?.active;
  const nextRole = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : undefined;
  const data: any = {};
  if (typeof nextActive === "boolean") data.active = nextActive;
  if (nextRole && isRole(nextRole) && nextRole !== "ENTERPRISE_ADMIN") data.role = nextRole;

  const updated = await prisma.user.update({ where: { id }, data });
  if (data.active === false) {
    await prisma.refreshToken.updateMany({ where: { userId: id, revoked: false }, data: { revoked: true } });
  }
  res.json({
    ...updated,
    isStaff: updated.role !== "STUDENT",
  });
});

router.get("/feature-flags", async (_req, res) => {
  const adminUser = (_req as any).adminUser as { enterpriseId: string };
  const flags = await prisma.featureFlag.findMany({
    where: { enterpriseId: adminUser.enterpriseId },
    orderBy: { key: "asc" },
  });
  res.json(flags);
});

router.patch("/feature-flags/:key", async (req, res) => {
  const adminUser = (req as any).adminUser as { enterpriseId: string };
  const key = String(req.params.key);
  const enabled = req.body?.enabled;

  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled boolean required" });

  try {
    const updated = await prisma.featureFlag.update({
      where: { enterpriseId_key: { enterpriseId: adminUser.enterpriseId, key } },
      data: { enabled },
    });
    res.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Feature flag not found" });
    console.error("update feature flag error", err);
    return res.status(500).json({ error: "Could not update feature flag" });
  }
});

router.get("/audit-logs", async (req, res) => {
  const adminUser = (req as any).adminUser as { enterpriseId: string } | undefined;
  const enterpriseId = adminUser?.enterpriseId;
  if (!enterpriseId) return res.status(500).json({ error: "Enterprise not resolved" });

  const parsedFrom = req.query.from ? new Date(String(req.query.from)) : undefined;
  const parsedTo = req.query.to ? new Date(String(req.query.to)) : undefined;
  const from = parsedFrom && !isNaN(parsedFrom.getTime()) ? parsedFrom : undefined;
  const to = parsedTo && !isNaN(parsedTo.getTime()) ? parsedTo : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const logs = await listAuditLogs({ enterpriseId, from, to, limit });
  const payload = logs.map((entry) => ({
    id: entry.id,
    action: entry.action,
    createdAt: entry.createdAt,
    ip: entry.ip,
    userAgent: entry.userAgent,
    user: {
      id: entry.user.id,
      email: entry.user.email,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      role: entry.user.role === "ENTERPRISE_ADMIN" ? "ADMIN" : entry.user.role,
    },
  }));

  res.json(payload);
});

export default router;
