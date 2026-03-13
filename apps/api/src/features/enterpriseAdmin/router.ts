import { Router, type NextFunction, type Response } from "express";
import type { Prisma, Role } from "@prisma/client";
import { requireAuth, type AuthRequest } from "../../auth/middleware.js";
import { prisma } from "../../shared/db.js";
import {
  buildEnterpriseAccessUserSearchWhere,
  parseEnterpriseAccessUserSearchFilters,
} from "./accessUserSearch.js";
import { buildEnterpriseModuleSearchWhere, parseEnterpriseModuleSearchFilters } from "./moduleSearch.js";

type EnterpriseUserRole = Extract<Role, "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN">;
type EnterpriseUser = {
  id: number;
  enterpriseId: string;
  role: EnterpriseUserRole;
};
type EnterpriseRequest = AuthRequest & { enterpriseUser?: EnterpriseUser };

type AssignableUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
};

const router = Router();
const MODULE_NAME_MAX_LENGTH = 120;
const MODULE_SECTION_MAX_LENGTH = 8_000;

const MODULE_SELECT = {
  id: true,
  name: true,
  briefText: true,
  timelineText: true,
  expectationsText: true,
  readinessNotesText: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      userModules: true,
      moduleLeads: true,
      moduleTeachingAssistants: true,
    },
  },
} satisfies Prisma.ModuleSelect;

router.use(requireAuth);
router.use(resolveEnterpriseUser);

router.get("/overview", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  if (!isEnterpriseAdminRole(enterpriseUser.role)) return res.status(403).json({ error: "Forbidden" });

  const thirtyDaysAgo = getUtcStartOfDaysAgo(30);

  const [
    users,
    activeUsers,
    students,
    staff,
    enterpriseAdmins,
    modules,
    teams,
    meetings,
    inactiveUsers,
    studentsWithoutModule,
    modulesWithoutStudents,
    newUsers30d,
    newModules30d,
  ] = await Promise.all([
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, active: true } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, role: "STUDENT" } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, role: "STAFF" } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, role: "ENTERPRISE_ADMIN" } }),
    prisma.module.count({ where: { enterpriseId: enterpriseUser.enterpriseId } }),
    prisma.team.count({ where: { enterpriseId: enterpriseUser.enterpriseId } }),
    prisma.meeting.count({ where: { team: { enterpriseId: enterpriseUser.enterpriseId } } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, active: false } }),
    prisma.user.count({
      where: {
        enterpriseId: enterpriseUser.enterpriseId,
        role: "STUDENT",
        userModules: { none: {} },
      },
    }),
    prisma.module.count({ where: { enterpriseId: enterpriseUser.enterpriseId, userModules: { none: {} } } }),
    prisma.user.count({ where: { enterpriseId: enterpriseUser.enterpriseId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.module.count({ where: { enterpriseId: enterpriseUser.enterpriseId, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  return res.json({
    totals: {
      users,
      activeUsers,
      students,
      staff,
      enterpriseAdmins,
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
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const modules = await prisma.module.findMany({
    where: {
      enterpriseId: enterpriseUser.enterpriseId,
      ...(isEnterpriseAdminRole(enterpriseUser.role)
        ? {}
        : {
            OR: [
              { moduleLeads: { some: { userId: enterpriseUser.id } } },
              { moduleTeachingAssistants: { some: { userId: enterpriseUser.id } } },
            ],
          }),
    },
    select: {
      ...MODULE_SELECT,
      moduleLeads: {
        where: { userId: enterpriseUser.id },
        select: { userId: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return res.json(
    modules.map((module) => ({
      ...mapModuleRecord(module),
      canManageAccess: module.moduleLeads.length > 0,
    })),
  );
});

router.get("/modules/search", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const parsedFilters = parseEnterpriseModuleSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });

  const baseWhere: Prisma.ModuleWhereInput = {
    enterpriseId: enterpriseUser.enterpriseId,
    ...(isEnterpriseAdminRole(enterpriseUser.role)
      ? {}
      : {
          OR: [
            { moduleLeads: { some: { userId: enterpriseUser.id } } },
            { moduleTeachingAssistants: { some: { userId: enterpriseUser.id } } },
          ],
        }),
  };

  const where = buildEnterpriseModuleSearchWhere(baseWhere, parsedFilters.value);
  const offset = (parsedFilters.value.page - 1) * parsedFilters.value.pageSize;
  const [total, modules] = await prisma.$transaction([
    prisma.module.count({ where }),
    prisma.module.findMany({
      where,
      select: {
        ...MODULE_SELECT,
        moduleLeads: {
          where: { userId: enterpriseUser.id },
          select: { userId: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: parsedFilters.value.pageSize,
    }),
  ]);

  return res.json(
    toEnterpriseModuleSearchResponse(
      modules.map((module) => ({
        ...mapModuleRecord(module),
        canManageAccess: module.moduleLeads.length > 0,
      })),
      parsedFilters.value,
      total,
    ),
  );
});

router.get("/modules/access-users", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const [staff, students] = await Promise.all([
    prisma.user.findMany({
      where: {
        enterpriseId: enterpriseUser.enterpriseId,
        role: { in: ["STAFF", "ENTERPRISE_ADMIN", "ADMIN"] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        enterpriseId: enterpriseUser.enterpriseId,
        role: "STUDENT",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
  ]);

  return res.json({ staff, students });
});

router.get("/modules/access-users/search", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const parsedFilters = parseEnterpriseAccessUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });

  const where = buildEnterpriseAccessUserSearchWhere(enterpriseUser.enterpriseId, parsedFilters.value);
  const offset = (parsedFilters.value.page - 1) * parsedFilters.value.pageSize;
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
      skip: offset,
      take: parsedFilters.value.pageSize,
    }),
  ]);

  return res.json(toEnterpriseAccessUserSearchResponse(users, parsedFilters.value, total));
});

router.post("/modules", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const payload = parseModulePayload(req.body);
  if (!payload.ok) return res.status(400).json({ error: payload.error });

  const leaderIds = ensureCreatorLeader(payload.value.leaderIds, enterpriseUser);
  if (leaderIds.length === 0) {
    return res.status(400).json({ error: "At least one module leader is required" });
  }

  const taIds = payload.value.taIds.filter((id) => !leaderIds.includes(id));

  const existing = await prisma.module.findFirst({
    where: { enterpriseId: enterpriseUser.enterpriseId, name: payload.value.name },
    select: { id: true },
  });
  if (existing) return res.status(409).json({ error: "Module name already exists" });

  const validation = await validateAssignmentUsers({
    enterpriseId: enterpriseUser.enterpriseId,
    leaderIds,
    taIds,
    studentIds: payload.value.studentIds,
  });
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  const created = await prisma.$transaction(async (tx) => {
    const module = await tx.module.create({
      data: {
        enterpriseId: enterpriseUser.enterpriseId,
        name: payload.value.name,
        briefText: payload.value.briefText,
        timelineText: payload.value.timelineText,
        expectationsText: payload.value.expectationsText,
        readinessNotesText: payload.value.readinessNotesText,
      },
      select: { id: true },
    });

    await replaceModuleAssignments(tx, {
      enterpriseId: enterpriseUser.enterpriseId,
      moduleId: module.id,
      leaderIds,
      taIds,
      studentIds: payload.value.studentIds,
    });

    const withCounts = await tx.module.findUnique({ where: { id: module.id }, select: MODULE_SELECT });
    if (!withCounts) throw new Error("Failed to load created module");

    return withCounts;
  });

  return res.status(201).json(mapModuleRecord(created));
});

router.get("/modules/:moduleId/access", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: MODULE_SELECT,
  });
  if (!module) return res.status(404).json({ error: "Module not found" });

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return res.status(403).json({ error: "Forbidden" });

  const [staffUsers, students] = await Promise.all([
    prisma.user.findMany({
      where: {
        enterpriseId: enterpriseUser.enterpriseId,
        role: { in: ["STAFF", "ENTERPRISE_ADMIN", "ADMIN"] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        moduleLeads: {
          where: { moduleId },
          select: { moduleId: true },
        },
        moduleTeachingAssistants: {
          where: { moduleId },
          select: { moduleId: true },
        },
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
    prisma.user.findMany({
      where: { enterpriseId: enterpriseUser.enterpriseId, role: "STUDENT" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        userModules: {
          where: { enterpriseId: enterpriseUser.enterpriseId, moduleId },
          select: { moduleId: true },
        },
        moduleTeachingAssistants: {
          where: { moduleId },
          select: { moduleId: true },
        },
      },
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
  ]);

  return res.json({
    module: mapModuleRecord(module),
    staff: staffUsers.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      active: user.active,
      isLeader: user.moduleLeads.length > 0,
      isTeachingAssistant: user.moduleTeachingAssistants.length > 0,
    })),
    students: students.map((student) => ({
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      active: student.active,
      enrolled: student.userModules.length > 0,
      isTeachingAssistant: student.moduleTeachingAssistants.length > 0,
    })),
  });
});

router.get("/modules/:moduleId/access-selection", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: MODULE_SELECT,
  });
  if (!module) return res.status(404).json({ error: "Module not found" });

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return res.status(403).json({ error: "Forbidden" });

  const [leaders, teachingAssistants, students] = await Promise.all([
    prisma.moduleLead.findMany({
      where: { moduleId },
      select: { userId: true },
    }),
    prisma.moduleTeachingAssistant.findMany({
      where: { moduleId },
      select: { userId: true },
    }),
    prisma.userModule.findMany({
      where: { enterpriseId: enterpriseUser.enterpriseId, moduleId },
      select: { userId: true },
    }),
  ]);

  return res.json({
    module: mapModuleRecord(module),
    leaderIds: leaders.map((item) => item.userId),
    taIds: teachingAssistants.map((item) => item.userId),
    studentIds: students.map((item) => item.userId),
  });
});

router.put("/modules/:moduleId", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return res.status(403).json({ error: "Forbidden" });

  const payload = parseModulePayload(req.body);
  if (!payload.ok) return res.status(400).json({ error: payload.error });

  const leaderIds = payload.value.leaderIds;
  if (leaderIds.length === 0) {
    return res.status(400).json({ error: "At least one module leader is required" });
  }

  const taIds = payload.value.taIds.filter((id) => !leaderIds.includes(id));

  const existing = await prisma.module.findFirst({
    where: {
      enterpriseId: enterpriseUser.enterpriseId,
      name: payload.value.name,
      id: { not: moduleId },
    },
    select: { id: true },
  });
  if (existing) return res.status(409).json({ error: "Module name already exists" });

  const validation = await validateAssignmentUsers({
    enterpriseId: enterpriseUser.enterpriseId,
    leaderIds,
    taIds,
    studentIds: payload.value.studentIds,
  });
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  const updated = await prisma.$transaction(async (tx) => {
    const module = await tx.module.findFirst({
      where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
      select: { id: true },
    });
    if (!module) return null;

    await tx.module.update({
      where: { id: moduleId },
      data: {
        name: payload.value.name,
        briefText: payload.value.briefText,
        timelineText: payload.value.timelineText,
        expectationsText: payload.value.expectationsText,
        readinessNotesText: payload.value.readinessNotesText,
      },
    });

    await replaceModuleAssignments(tx, {
      enterpriseId: enterpriseUser.enterpriseId,
      moduleId,
      leaderIds,
      taIds,
      studentIds: payload.value.studentIds,
    });

    return tx.module.findUnique({ where: { id: moduleId }, select: MODULE_SELECT });
  });

  if (!updated) return res.status(404).json({ error: "Module not found" });

  return res.json(mapModuleRecord(updated));
});

router.delete("/modules/:moduleId", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return res.status(403).json({ error: "Forbidden" });

  const deleted = await prisma.$transaction(async (tx) => {
    const module = await tx.module.findFirst({
      where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
      select: { id: true },
    });
    if (!module) return false;

    await tx.moduleLead.deleteMany({ where: { moduleId } });
    await tx.moduleTeachingAssistant.deleteMany({ where: { moduleId } });
    await tx.userModule.deleteMany({ where: { enterpriseId: enterpriseUser.enterpriseId, moduleId } });
    await tx.module.delete({ where: { id: moduleId } });
    return true;
  });

  if (!deleted) return res.status(404).json({ error: "Module not found" });

  return res.json({ moduleId, deleted: true as const });
});

router.get("/modules/:moduleId/students", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: MODULE_SELECT,
  });
  if (!module) return res.status(404).json({ error: "Module not found" });

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return res.status(403).json({ error: "Forbidden" });

  const students = await prisma.user.findMany({
    where: { enterpriseId: enterpriseUser.enterpriseId, role: "STUDENT" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      active: true,
      userModules: {
        where: { enterpriseId: enterpriseUser.enterpriseId, moduleId },
        select: { moduleId: true },
      },
    },
    orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
  });

  return res.json({
    module: mapModuleRecord(module),
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
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return res.status(403).json({ error: "Forbidden" });

  const parsedStudentIds = parsePositiveIntArray(req.body?.studentIds, "studentIds");
  if (!parsedStudentIds.ok) return res.status(400).json({ error: parsedStudentIds.error });
  const studentIds = parsedStudentIds.value;

  const module = await prisma.module.findFirst({ where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId }, select: { id: true } });
  if (!module) return res.status(404).json({ error: "Module not found" });

  const validation = await validateAssignmentUsers({
    enterpriseId: enterpriseUser.enterpriseId,
    leaderIds: [],
    taIds: [],
    studentIds,
  });
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  await prisma.$transaction(async (tx) => {
    await tx.userModule.deleteMany({ where: { enterpriseId: enterpriseUser.enterpriseId, moduleId } });

    if (studentIds.length > 0) {
      await tx.userModule.createMany({
        data: studentIds.map((studentId) => ({ enterpriseId: enterpriseUser.enterpriseId, moduleId, userId: studentId })),
      });
    }
  });

  return res.json({
    moduleId,
    studentIds,
    studentCount: studentIds.length,
  });
});

async function resolveEnterpriseUser(req: EnterpriseRequest, res: Response, next: NextFunction) {
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

async function canManageModuleAccess(user: EnterpriseUser, moduleId: number): Promise<boolean> {
  const membership = await prisma.moduleLead.findFirst({
    where: {
      moduleId,
      userId: user.id,
      module: { enterpriseId: user.enterpriseId },
    },
    select: { moduleId: true },
  });

  return Boolean(membership);
}

function isEnterpriseAdminRole(role: EnterpriseUserRole): role is Extract<EnterpriseUserRole, "ENTERPRISE_ADMIN" | "ADMIN"> {
  return role === "ENTERPRISE_ADMIN" || role === "ADMIN";
}

function parsePositiveInt(value: string | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parsePositiveIntArray(
  value: unknown,
  field: string,
): { ok: true; value: number[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: `${field} must be an array` };

  const unique: number[] = [];
  const seen = new Set<number>();
  for (const entry of value) {
    const parsed = Number(entry);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: `${field} must contain positive integers` };
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

function parseOptionalTextField(
  value: unknown,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${label} must be a string` };

  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > MODULE_SECTION_MAX_LENGTH) {
    return { ok: false, error: `${label} must be ${MODULE_SECTION_MAX_LENGTH} characters or fewer` };
  }

  return { ok: true, value: trimmed };
}

type ParsedModulePayload = {
  name: string;
  briefText: string | null;
  timelineText: string | null;
  expectationsText: string | null;
  readinessNotesText: string | null;
  leaderIds: number[];
  taIds: number[];
  studentIds: number[];
};

function parseModulePayload(body: unknown): { ok: true; value: ParsedModulePayload } | { ok: false; error: string } {
  const name = typeof (body as any)?.name === "string" ? (body as any).name.trim() : "";
  if (!name) return { ok: false, error: "Module name is required" };
  if (name.length > MODULE_NAME_MAX_LENGTH) {
    return { ok: false, error: `Module name must be ${MODULE_NAME_MAX_LENGTH} characters or fewer` };
  }

  const briefText = parseOptionalTextField((body as any)?.briefText, "Module brief");
  if (!briefText.ok) return { ok: false, error: briefText.error };

  const timelineText = parseOptionalTextField((body as any)?.timelineText, "Timeline");
  if (!timelineText.ok) return { ok: false, error: timelineText.error };

  const expectationsText = parseOptionalTextField((body as any)?.expectationsText, "Module expectations");
  if (!expectationsText.ok) return { ok: false, error: expectationsText.error };

  const readinessNotesText = parseOptionalTextField((body as any)?.readinessNotesText, "Readiness notes");
  if (!readinessNotesText.ok) return { ok: false, error: readinessNotesText.error };

  const leaderIds = parsePositiveIntArray((body as any)?.leaderIds ?? [], "leaderIds");
  if (!leaderIds.ok) return { ok: false, error: leaderIds.error };

  const taIds = parsePositiveIntArray((body as any)?.taIds ?? [], "taIds");
  if (!taIds.ok) return { ok: false, error: taIds.error };

  const studentIds = parsePositiveIntArray((body as any)?.studentIds ?? [], "studentIds");
  if (!studentIds.ok) return { ok: false, error: studentIds.error };

  return {
    ok: true,
    value: {
      name,
      briefText: briefText.value,
      timelineText: timelineText.value,
      expectationsText: expectationsText.value,
      readinessNotesText: readinessNotesText.value,
      leaderIds: leaderIds.value,
      taIds: taIds.value,
      studentIds: studentIds.value,
    },
  };
}

function ensureCreatorLeader(leaderIds: number[], user: EnterpriseUser): number[] {
  if (leaderIds.includes(user.id)) return leaderIds;
  return [...leaderIds, user.id];
}

async function validateAssignmentUsers(input: {
  enterpriseId: string;
  leaderIds: number[];
  taIds: number[];
  studentIds: number[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const requestedIds = [...new Set([...input.leaderIds, ...input.taIds, ...input.studentIds])];
  if (requestedIds.length === 0) return { ok: true };

  const users = await prisma.user.findMany({
    where: {
      enterpriseId: input.enterpriseId,
      id: { in: requestedIds },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (users.length !== requestedIds.length) {
    return { ok: false, error: "Some selected users do not belong to this enterprise" };
  }

  const roleById = new Map(users.map((user) => [user.id, user.role]));

  for (const id of input.leaderIds) {
    const role = roleById.get(id);
    if (role !== "STAFF" && role !== "ENTERPRISE_ADMIN" && role !== "ADMIN") {
      return { ok: false, error: "Module leaders must be staff or admin accounts" };
    }
  }

  for (const id of input.taIds) {
    if (!roleById.has(id)) {
      return { ok: false, error: "Some selected users do not belong to this enterprise" };
    }
  }

  for (const id of input.studentIds) {
    const role = roleById.get(id);
    if (role !== "STUDENT") {
      return { ok: false, error: "Student assignments can only include student accounts" };
    }
  }

  return { ok: true };
}

async function replaceModuleAssignments(
  tx: Prisma.TransactionClient,
  input: {
    enterpriseId: string;
    moduleId: number;
    leaderIds: number[];
    taIds: number[];
    studentIds: number[];
  },
) {
  await tx.moduleLead.deleteMany({ where: { moduleId: input.moduleId } });
  await tx.moduleTeachingAssistant.deleteMany({ where: { moduleId: input.moduleId } });
  await tx.userModule.deleteMany({ where: { enterpriseId: input.enterpriseId, moduleId: input.moduleId } });

  if (input.leaderIds.length > 0) {
    await tx.moduleLead.createMany({
      data: input.leaderIds.map((userId) => ({ moduleId: input.moduleId, userId })),
      skipDuplicates: true,
    });
  }

  if (input.taIds.length > 0) {
    await tx.moduleTeachingAssistant.createMany({
      data: input.taIds.map((userId) => ({ moduleId: input.moduleId, userId })),
      skipDuplicates: true,
    });
  }

  if (input.studentIds.length > 0) {
    await tx.userModule.createMany({
      data: input.studentIds.map((userId) => ({
        enterpriseId: input.enterpriseId,
        moduleId: input.moduleId,
        userId,
      })),
      skipDuplicates: true,
    });
  }
}

function mapModuleRecord(module: Prisma.ModuleGetPayload<{ select: typeof MODULE_SELECT }>) {
  return {
    id: module.id,
    name: module.name,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
    briefText: module.briefText ?? undefined,
    timelineText: module.timelineText ?? undefined,
    expectationsText: module.expectationsText ?? undefined,
    readinessNotesText: module.readinessNotesText ?? undefined,
    studentCount: module._count.userModules,
    leaderCount: module._count.moduleLeads,
    teachingAssistantCount: module._count.moduleTeachingAssistants,
  };
}

function toEnterpriseModuleSearchResponse(
  items: Array<ReturnType<typeof mapModuleRecord> & { canManageAccess: boolean }>,
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

function toEnterpriseAccessUserSearchResponse(
  items: AssignableUser[],
  filters: { scope: "staff" | "students" | "all"; query: string | null; page: number; pageSize: number },
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
    scope: filters.scope,
  };
}

export default router;
