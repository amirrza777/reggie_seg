import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../shared/db.js";
import { listAuditLogs } from "../audit/service.js";

type UserRole = "STUDENT" | "STAFF" | "ADMIN";

type AdminUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isStaff: boolean;
  role: UserRole;
  active: boolean;
};

type FeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
};

const router = Router();
const refreshSecret = process.env.JWT_REFRESH_SECRET || "";

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
  } catch (err) {
    return res.status(401).json({ error: "Not authenticated" });
  }
};

const users: AdminUser[] = [
  {
    id: 1,
    email: "admin@kcl.ac.uk",
    firstName: "Admin",
    lastName: "User",
    isStaff: true,
    role: "ADMIN",
    active: true,
  },
  {
    id: 2,
    email: "michael.kolling@kcl.ac.uk",
    firstName: "Michael",
    lastName: "Kölling",
    isStaff: true,
    role: "STAFF",
    active: true,
  },
  {
    id: 3,
    email: "tunjay.seyidali@kcl.ac.uk",
    firstName: "Tunjay",
    lastName: "Seyidali",
    isStaff: false,
    role: "STUDENT",
    active: true,
  },
];

const featureFlags: FeatureFlag[] = [
  { key: "peer_feedback", label: "Peer feedback", enabled: true },
  { key: "modules", label: "Modules", enabled: true },
  { key: "repos", label: "Repos", enabled: false },
];

const isRole = (value: unknown): value is UserRole =>
  value === "STUDENT" || value === "STAFF" || value === "ADMIN";

router.use(ensureAdmin);

router.get("/users", (_req, res) => {
  res.json(users);
});

router.patch("/users/:id/role", (req, res) => {
  const id = Number(req.params.id);
  const role = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : "";
  const user = users.find((entry) => entry.id === id);

  if (!user) return res.status(404).json({ error: "User not found" });
  if (!isRole(role)) return res.status(400).json({ error: "Invalid role" });

  user.role = role;
  user.isStaff = role !== "STUDENT";
  res.json(user);
});

router.patch("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = users.find((entry) => entry.id === id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const nextActive = req.body?.active;
  const nextRole = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : undefined;

  if (typeof nextActive === "boolean") user.active = nextActive;
  if (nextRole && isRole(nextRole)) {
    user.role = nextRole;
    user.isStaff = nextRole !== "STUDENT";
  }

  res.json(user);
});

router.get("/feature-flags", (_req, res) => {
  res.json(featureFlags);
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
      role: entry.user.role,
    },
  }));

  res.json(payload);
});

export default router;