import { Router, type NextFunction, type Response } from "express";
import type { Role } from "@prisma/client";
import { requireAuth, type AuthRequest } from "../../auth/middleware.js";
import { prisma } from "../../shared/db.js";

type EnterpriseAdminRole = Extract<Role, "ENTERPRISE_ADMIN" | "ADMIN">;
type EnterpriseAdminUser = {
  id: number;
  enterpriseId: string;
  role: EnterpriseAdminRole;
};
type EnterpriseAdminRequest = AuthRequest & { enterpriseAdminUser?: EnterpriseAdminUser };

const router = Router();
const MODULE_NAME_MAX_LENGTH = 120;

router.use(requireAuth);
router.use(resolveEnterpriseAdminUser);

router.get("/overview", async (req, res) => {
  const enterpriseId = (req as EnterpriseAdminRequest).enterpriseAdminUser?.enterpriseId;
  if (!enterpriseId) return res.status(500).json({ error: "Enterprise not resolved" });

  const thirtyDaysAgo = getUtcStartOfDaysAgo(30);

  const [
    users,
    activeUsers,
    students,
    staff,
    enterpriseAdmins,
    admins,
    modules,
    teams,
    meetings,
    inactiveUsers,
    studentsWithoutModule,
    modulesWithoutStudents,
    newUsers30d,
    newModules30d,
  ] = await Promise.all([
    prisma.user.count({ where: { enterpriseId } }),
    prisma.user.count({ where: { enterpriseId, active: true } }),
    prisma.user.count({ where: { enterpriseId, role: "STUDENT" } }),
    prisma.user.count({ where: { enterpriseId, role: "STAFF" } }),
    prisma.user.count({ where: { enterpriseId, role: "ENTERPRISE_ADMIN" } }),
    prisma.user.count({ where: { enterpriseId, role: "ADMIN" } }),
    prisma.module.count({ where: { enterpriseId } }),
    prisma.team.count({ where: { enterpriseId } }),
    prisma.meeting.count({ where: { team: { enterpriseId } } }),
    prisma.user.count({ where: { enterpriseId, active: false } }),
    prisma.user.count({ where: { enterpriseId, role: "STUDENT", userModules: { none: {} } } }),
    prisma.module.count({ where: { enterpriseId, userModules: { none: {} } } }),
    prisma.user.count({ where: { enterpriseId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.module.count({ where: { enterpriseId, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  return res.json({
    totals: {
      users,
      activeUsers,
      students,
      staff,
      enterpriseAdmins,
      admins,
      modules,
      teams,
      meetings,
    },
    hygiene: {
      inactiveUsers,
      studentsWithoutModule,
      modulesWithoutStudents,
    },
    trends: {
      newUsers30d,
      newModules30d,
    },
  });
});

router.get("/modules", async (req, res) => {
  const enterpriseId = (req as EnterpriseAdminRequest).enterpriseAdminUser?.enterpriseId;
  if (!enterpriseId) return res.status(500).json({ error: "Enterprise not resolved" });

  const modules = await prisma.module.findMany({
    where: { enterpriseId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { userModules: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return res.json(
    modules.map((module) => ({
      id: module.id,
      name: module.name,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      studentCount: module._count.userModules,
    })),
  );
});

router.post("/modules", async (req, res) => {
  const enterpriseId = (req as EnterpriseAdminRequest).enterpriseAdminUser?.enterpriseId;
  if (!enterpriseId) return res.status(500).json({ error: "Enterprise not resolved" });

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) return res.status(400).json({ error: "Module name is required" });
  if (name.length > MODULE_NAME_MAX_LENGTH) {
    return res.status(400).json({ error: `Module name must be ${MODULE_NAME_MAX_LENGTH} characters or fewer` });
  }

  const existing = await prisma.module.findFirst({
    where: { enterpriseId, name },
    select: { id: true },
  });
  if (existing) return res.status(409).json({ error: "Module name already exists" });

  const created = await prisma.module.create({
    data: { enterpriseId, name },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return res.status(201).json({ ...created, studentCount: 0 });
});

router.get("/modules/:moduleId/students", async (req, res) => {
  const enterpriseId = (req as EnterpriseAdminRequest).enterpriseAdminUser?.enterpriseId;
  if (!enterpriseId) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId },
    select: { id: true, name: true, createdAt: true, updatedAt: true, _count: { select: { userModules: true } } },
  });
  if (!module) return res.status(404).json({ error: "Module not found" });

  const students = await prisma.user.findMany({
    where: { enterpriseId, role: "STUDENT" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      active: true,
      userModules: {
        where: { enterpriseId, moduleId },
        select: { moduleId: true },
      },
    },
    orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
  });

  return res.json({
    module: {
      id: module.id,
      name: module.name,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      studentCount: module._count.userModules,
    },
    students: students.map((student) => ({
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      active: student.active,
      enrolled: student.userModules.length > 0,
    })),
  });
});

router.put("/modules/:moduleId/students", async (req, res) => {
  const enterpriseId = (req as EnterpriseAdminRequest).enterpriseAdminUser?.enterpriseId;
  if (!enterpriseId) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const parsedStudentIds = parsePositiveIntArray(req.body?.studentIds);
  if (!parsedStudentIds.ok) return res.status(400).json({ error: parsedStudentIds.error });
  const studentIds = parsedStudentIds.value;

  const module = await prisma.module.findFirst({ where: { id: moduleId, enterpriseId }, select: { id: true } });
  if (!module) return res.status(404).json({ error: "Module not found" });

  if (studentIds.length > 0) {
    const eligibleStudents = await prisma.user.findMany({
      where: { enterpriseId, role: "STUDENT", id: { in: studentIds } },
      select: { id: true },
    });

    if (eligibleStudents.length !== studentIds.length) {
      return res.status(400).json({ error: "Some selected users are not students in this enterprise" });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userModule.deleteMany({
      where: { enterpriseId, moduleId },
    });

    if (studentIds.length > 0) {
      await tx.userModule.createMany({
        data: studentIds.map((studentId) => ({ enterpriseId, moduleId, userId: studentId })),
      });
    }
  });

  return res.json({
    moduleId,
    studentIds,
    studentCount: studentIds.length,
  });
});

async function resolveEnterpriseAdminUser(req: EnterpriseAdminRequest, res: Response, next: NextFunction) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, enterpriseId: true, role: true, active: true },
  });

  if (!user || user.active === false) return res.status(403).json({ error: "Forbidden" });
  if (user.role !== "ENTERPRISE_ADMIN" && user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

  req.enterpriseAdminUser = {
    id: user.id,
    enterpriseId: user.enterpriseId,
    role: user.role,
  };
  return next();
}

function parsePositiveInt(value: string | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parsePositiveIntArray(value: unknown): { ok: true; value: number[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: "studentIds must be an array" };

  const unique: number[] = [];
  const seen = new Set<number>();
  for (const entry of value) {
    const parsed = Number(entry);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: "studentIds must contain positive integers" };
    }
    if (seen.has(parsed)) continue;
    seen.add(parsed);
    unique.push(parsed);
  }

  return { ok: true, value: unique };
}

function getUtcStartOfDaysAgo(days: number): Date {
  const now = new Date();
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(utcMidnight - days * 24 * 60 * 60 * 1000);
}

export default router;
