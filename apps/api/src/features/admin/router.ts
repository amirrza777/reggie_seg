import { Router, type NextFunction, type Request, type Response } from "express";
import type { User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { prisma } from "../../shared/db.js";
import { listAuditLogs } from "../audit/service.js";
import { EnterpriseCodeGeneratorService } from "../services/enterprise/enterpriseCodeGeneratorService.js";
import { buildAdminEnterpriseSearchWhere, parseAdminEnterpriseSearchFilters } from "./enterpriseSearch.js";
import { buildAdminUserSearchWhere, parseAdminUserSearchFilters } from "./userSearch.js";

type UserRole = "STUDENT" | "STAFF" | "ADMIN" | "ENTERPRISE_ADMIN";
type AdminUser = Pick<User, "id" | "email" | "enterpriseId" | "role">;
type AdminRequest = Request & { adminUser?: AdminUser };
type EnterpriseFlagSeed = { key: string; label: string; enabled: boolean };

const router = Router();
const refreshSecret = process.env.JWT_REFRESH_SECRET || "";
const SUPER_ADMIN_EMAIL = "admin@kcl.ac.uk";
const ENTERPRISE_CODE_REGEX = /^[A-Z0-9]{3,16}$/;
const enterpriseCodeGenerator = new EnterpriseCodeGeneratorService();
const defaultEnterpriseFeatureFlags: EnterpriseFlagSeed[] = [
  { key: "peer_feedback", label: "Peer feedback", enabled: true },
  { key: "modules", label: "Modules", enabled: true },
  { key: "repos", label: "Repositories", enabled: true },
];

const ensureAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, refreshSecret) as { sub?: number; admin?: boolean };
    if (!payload?.sub) return res.status(401).json({ error: "Not authenticated" });
    if (!payload.admin) return res.status(403).json({ error: "Forbidden" });

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, enterpriseId: true, role: true },
    });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

    req.adminUser = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Not authenticated" });
  }
};

const ensureSuperAdmin = (req: AdminRequest, res: Response, next: NextFunction) => {
  const adminUser = req.adminUser;
  if (!adminUser || adminUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
};

const isRole = (value: unknown): value is UserRole =>
  value === "STUDENT" || value === "STAFF" || value === "ADMIN" || value === "ENTERPRISE_ADMIN";

router.use(ensureAdmin);

router.use("/enterprises", ensureSuperAdmin);

router.get("/summary", async (req, res) => {
  const adminUser = (req as AdminRequest).adminUser as { enterpriseId: string };
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
  const adminUser = (req as AdminRequest).adminUser as { enterpriseId: string };
  const enterpriseId = adminUser.enterpriseId;
  const records = await prisma.user.findMany({
    where: { enterpriseId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
    orderBy: { id: "asc" },
  });
  const payload = records.map((u) => ({
    ...u,
    isStaff: u.role !== "STUDENT",
    role: u.role as UserRole,
  }));
  res.json(payload);
});

router.get("/users/search", async (req, res) => {
  const adminUser = (req as AdminRequest).adminUser as { enterpriseId: string };
  const parsedFilters = parseAdminUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });

  const where = buildAdminUserSearchWhere(adminUser.enterpriseId, parsedFilters.value);
  const offset = (parsedFilters.value.page - 1) * parsedFilters.value.pageSize;
  const [total, records] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
      orderBy: [{ id: "asc" }],
      skip: offset,
      take: parsedFilters.value.pageSize,
    }),
  ]);

  return res.json(toAdminUserSearchResponse(records, parsedFilters.value, total));
});

router.patch("/users/:id/role", async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid user id" });
  const role = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : "";
  if (!isRole(role)) return res.status(400).json({ error: "Invalid role" });
  if (role === "ENTERPRISE_ADMIN") return res.status(400).json({ error: "Role not assignable" });

  const adminUser = (req as AdminRequest).adminUser as { enterpriseId: string };
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
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid user id" });
  const adminUser = (req as AdminRequest).adminUser as { enterpriseId: string };
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
  const adminUser = (_req as AdminRequest).adminUser as { enterpriseId: string };
  const flags = await prisma.featureFlag.findMany({
    where: { enterpriseId: adminUser.enterpriseId },
    orderBy: { key: "asc" },
  });
  res.json(flags.map(normalizeFeatureFlagLabel));
});

router.patch("/feature-flags/:key", async (req, res) => {
  const adminUser = (req as AdminRequest).adminUser as { enterpriseId: string };
  const key = String(req.params.key);
  const enabled = req.body?.enabled;

  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled boolean required" });

  try {
    const updated = await prisma.featureFlag.update({
      where: { enterpriseId_key: { enterpriseId: adminUser.enterpriseId, key } },
      data: { enabled },
    });
    res.json(normalizeFeatureFlagLabel(updated));
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Feature flag not found" });
    console.error("update feature flag error", err);
    return res.status(500).json({ error: "Could not update feature flag" });
  }
});

router.get("/enterprises", async (_req, res) => {
  const enterprises = await prisma.enterprise.findMany({
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

  res.json(enterprises.map(toAdminEnterprisePayload));
});

router.get("/enterprises/search", async (req, res) => {
  const parsedFilters = parseAdminEnterpriseSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });

  const where = buildAdminEnterpriseSearchWhere(parsedFilters.value);
  const offset = (parsedFilters.value.page - 1) * parsedFilters.value.pageSize;
  const [total, records] = await prisma.$transaction([
    prisma.enterprise.count({ where }),
    prisma.enterprise.findMany({
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
      take: parsedFilters.value.pageSize,
    }),
  ]);

  return res.json(toAdminEnterpriseSearchResponse(records.map(toAdminEnterprisePayload), parsedFilters.value, total));
});

router.post("/enterprises", async (req, res) => {
  const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const codeRaw = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
  if (!nameRaw) return res.status(400).json({ error: "Enterprise name is required" });
  if (nameRaw.length > 120) return res.status(400).json({ error: "Enterprise name is too long" });

  let code = codeRaw;
  if (code) {
    if (!ENTERPRISE_CODE_REGEX.test(code)) {
      return res.status(400).json({ error: "Code must be 3-16 uppercase letters or numbers" });
    }
  } else {
    code = await enterpriseCodeGenerator.generateFromName(nameRaw);
  }

  const exists = await prisma.enterprise.findUnique({ where: { code }, select: { id: true } });
  if (exists) return res.status(409).json({ error: "Enterprise code already exists" });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const enterprise = await tx.enterprise.create({
        data: { name: nameRaw, code },
        select: { id: true, code: true, name: true, createdAt: true },
      });
      await tx.featureFlag.createMany({
        data: defaultEnterpriseFeatureFlags.map((flag) => ({
          enterpriseId: enterprise.id,
          key: flag.key,
          label: flag.label,
          enabled: flag.enabled,
        })),
      });
      return enterprise;
    });

    return res.status(201).json({
      ...created,
      users: 0,
      admins: 0,
      enterpriseAdmins: 0,
      staff: 0,
      students: 0,
      modules: 0,
      teams: 0,
    });
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Enterprise code already exists" });
    console.error("create enterprise error", err);
    return res.status(500).json({ error: "Could not create enterprise" });
  }
});

router.get("/enterprises/:enterpriseId/users", async (req, res) => {
  const enterpriseId = String(req.params.enterpriseId || "");
  if (!enterpriseId) return res.status(400).json({ error: "Enterprise id is required" });

  const exists = await prisma.enterprise.findUnique({ where: { id: enterpriseId }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: "Enterprise not found" });

  const users = await prisma.user.findMany({
    where: { enterpriseId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
    orderBy: { id: "asc" },
  });

  return res.json(users.map(toAdminUserPayload));
});

router.get("/enterprises/:enterpriseId/users/search", async (req, res) => {
  const enterpriseId = String(req.params.enterpriseId || "");
  if (!enterpriseId) return res.status(400).json({ error: "Enterprise id is required" });

  const parsedFilters = parseAdminUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });

  const exists = await prisma.enterprise.findUnique({ where: { id: enterpriseId }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: "Enterprise not found" });

  const where = buildAdminUserSearchWhere(enterpriseId, parsedFilters.value);
  const offset = (parsedFilters.value.page - 1) * parsedFilters.value.pageSize;
  const [total, records] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
      orderBy: [{ id: "asc" }],
      skip: offset,
      take: parsedFilters.value.pageSize,
    }),
  ]);

  return res.json(toAdminUserSearchResponse(records, parsedFilters.value, total));
});

router.patch("/enterprises/:enterpriseId/users/:id", async (req, res) => {
  const enterpriseId = String(req.params.enterpriseId || "");
  const id = parsePositiveInt(req.params.id);
  if (!enterpriseId) return res.status(400).json({ error: "Enterprise id is required" });
  if (!id) return res.status(400).json({ error: "Invalid user id" });

  const user = await prisma.user.findFirst({ where: { id, enterpriseId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return res.status(400).json({ error: "Cannot modify super admin" });
  }

  const nextActive = req.body?.active;
  const nextRole = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : undefined;
  const data: { active?: boolean; role?: UserRole } = {};
  if (typeof nextActive === "boolean") data.active = nextActive;
  if (nextRole && isRole(nextRole) && nextRole !== "ENTERPRISE_ADMIN") data.role = nextRole;

  const updated = await prisma.user.update({ where: { id }, data });
  if (data.active === false) {
    await prisma.refreshToken.updateMany({ where: { userId: id, revoked: false }, data: { revoked: true } });
  }

  return res.json(toAdminUserPayload(updated));
});

router.delete("/enterprises/:enterpriseId", async (req, res) => {
  const enterpriseId = String(req.params.enterpriseId || "");
  if (!enterpriseId) return res.status(400).json({ error: "Enterprise id is required" });

  const adminUser = (req as AdminRequest).adminUser;
  if (adminUser?.enterpriseId === enterpriseId) {
    return res.status(400).json({ error: "Cannot delete your own enterprise" });
  }

  const enterprise = await prisma.enterprise.findUnique({
    where: { id: enterpriseId },
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
  if (!enterprise) return res.status(404).json({ error: "Enterprise not found" });

  if (enterprise._count.users > 0 || enterprise._count.modules > 0 || enterprise._count.teams > 0) {
    return res.status(400).json({
      error: `Cannot delete enterprise while it has users (${enterprise._count.users}), modules (${enterprise._count.modules}), or teams (${enterprise._count.teams}).`,
    });
  }

  await prisma.$transaction(async (tx) => {
    if (enterprise._count.auditLogs > 0) {
      await tx.auditLog.deleteMany({ where: { enterpriseId } });
    }
    await tx.featureFlag.deleteMany({ where: { enterpriseId } });
    await tx.enterprise.delete({ where: { id: enterpriseId } });
  });

  return res.json({ success: true });
});

function normalizeFeatureFlagLabel<T extends { key: string; label: string }>(flag: T): T {
  if (flag.key === "repos" && flag.label === "Repos") {
    return { ...flag, label: "Repositories" };
  }
  return flag;
}

router.get("/audit-logs", async (req, res) => {
  const adminUser = (req as AdminRequest).adminUser as { enterpriseId: string } | undefined;
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

function parsePositiveInt(value: string | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function toAdminUserPayload(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}) {
  return {
    ...user,
    isStaff: user.role !== "STUDENT",
    role: user.role as UserRole,
  };
}

function toAdminUserSearchResponse(
  records: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    active: boolean;
  }>,
  filters: { query: string | null; role: UserRole | null; active: boolean | null; page: number; pageSize: number },
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items: records.map(toAdminUserPayload),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
    role: filters.role,
    active: filters.active,
  };
}

function toAdminEnterprisePayload(enterprise: {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  users: Array<{ role: UserRole }>;
  _count: { users: number; modules: number; teams: number };
}) {
  const roleCount = enterprise.users.reduce(
    (acc, user) => {
      if (user.role === "ADMIN") acc.admins += 1;
      else if (user.role === "ENTERPRISE_ADMIN") acc.enterpriseAdmins += 1;
      else if (user.role === "STAFF") acc.staff += 1;
      else acc.students += 1;
      return acc;
    },
    { admins: 0, enterpriseAdmins: 0, staff: 0, students: 0 },
  );

  return {
    id: enterprise.id,
    code: enterprise.code,
    name: enterprise.name,
    createdAt: enterprise.createdAt,
    users: enterprise._count.users,
    modules: enterprise._count.modules,
    teams: enterprise._count.teams,
    ...roleCount,
  };
}

function toAdminEnterpriseSearchResponse(
  items: Array<{
    id: string;
    code: string;
    name: string;
    createdAt: Date;
    users: number;
    admins: number;
    enterpriseAdmins: number;
    staff: number;
    students: number;
    modules: number;
    teams: number;
  }>,
  filters: { query: string | null; page: number; pageSize: number },
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
  };
}

export default router;
