import { prisma } from "../../shared/db.js";
import { buildModuleMembershipFilterForUser } from "./repo.modules.js";

function toDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim() || "Unknown";
}

type ModuleAccessUser = { id: number; role: string; enterpriseId: string };

async function findModuleAccessUser(userId: number): Promise<ModuleAccessUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

export type ModuleStaffListMember = {
  userId: number;
  email: string;
  displayName: string;
  roles: Array<"LEAD" | "TA">;
};

type ModuleStaffAccumulator = Map<number, ModuleStaffListMember>;

const MODULE_STAFF_LIST_SELECT = {
  id: true,
  moduleLeads: {
    select: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  },
  moduleTeachingAssistants: {
    select: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  },
} as const;

async function findAccessibleModuleForStaffList(user: ModuleAccessUser, moduleId: number) {
  return prisma.module.findFirst({
    where: {
      id: moduleId,
      ...buildModuleMembershipFilterForUser(user, true),
    },
    select: MODULE_STAFF_LIST_SELECT,
  });
}

function upsertStaffMember(
  byId: ModuleStaffAccumulator,
  user: { id: number; email: string; firstName: string; lastName: string },
  role: "LEAD" | "TA",
): void {
  const current = byId.get(user.id) ?? {
    userId: user.id,
    email: user.email,
    displayName: toDisplayName(user.firstName, user.lastName),
    roles: [],
  };

  if (!current.roles.includes(role)) {
    current.roles.push(role);
  }
  byId.set(user.id, current);
}

function sortStaffMembers(byId: ModuleStaffAccumulator): ModuleStaffListMember[] {
  return Array.from(byId.values()).sort((left, right) => {
    const byName = left.displayName.localeCompare(right.displayName);
    if (byName !== 0) {
      return byName;
    }
    return left.userId - right.userId;
  });
}

function buildModuleStaffMembers(module: NonNullable<Awaited<ReturnType<typeof findAccessibleModuleForStaffList>>>) {
  const byId: ModuleStaffAccumulator = new Map();
  for (const row of module.moduleLeads) {
    upsertStaffMember(byId, row.user, "LEAD");
  }
  for (const row of module.moduleTeachingAssistants) {
    upsertStaffMember(byId, row.user, "TA");
  }
  return sortStaffMembers(byId);
}

export async function getModuleStaffListForUser(
  userId: number,
  moduleId: number,
): Promise<{ ok: true; members: ModuleStaffListMember[] } | { ok: false; status: 403 }> {
  const user = await findModuleAccessUser(userId);
  if (!user) {
    return { ok: false, status: 403 };
  }

  const module = await findAccessibleModuleForStaffList(user, moduleId);
  if (!module) {
    return { ok: false, status: 403 };
  }

  return { ok: true, members: buildModuleStaffMembers(module) };
}

export type ModuleStudentProjectMatrixProject = { id: number; name: string };

export type ModuleStudentProjectMatrixStudent = {
  userId: number;
  email: string;
  displayName: string;
  teamCells: Array<{ teamId: number; teamName: string } | null>;
};

type MatrixCell = { teamId: number; teamName: string };

type MatrixStudentRow = {
  userId: number;
  email: string;
  displayName: string;
  cells: Map<number, MatrixCell>;
};

const MODULE_STUDENT_MATRIX_SELECT = {
  id: true,
  projects: {
    select: {
      id: true,
      name: true,
      teams: {
        where: { archivedAt: null, allocationLifecycle: "ACTIVE" },
        select: {
          id: true,
          teamName: true,
          allocations: { select: { userId: true } },
        },
      },
    },
  },
  userModules: {
    select: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  },
} as const;

async function findAccessibleModuleForMatrix(user: ModuleAccessUser, moduleId: number) {
  return prisma.module.findFirst({
    where: {
      id: moduleId,
      ...buildModuleMembershipFilterForUser(user, true),
    },
    select: MODULE_STUDENT_MATRIX_SELECT,
  });
}

function pickBetterCell(current: MatrixCell | undefined, next: MatrixCell): MatrixCell {
  if (!current) {
    return next;
  }
  return next.teamName.localeCompare(current.teamName) < 0 ? next : current;
}

function initializeStudentRows(
  userModules: Array<{ user: { id: number; email: string; firstName: string; lastName: string } }>,
): Map<number, MatrixStudentRow> {
  const studentMap = new Map<number, MatrixStudentRow>();

  for (const userModule of userModules) {
    const user = userModule.user;
    studentMap.set(user.id, {
      userId: user.id,
      email: user.email,
      displayName: toDisplayName(user.firstName, user.lastName),
      cells: new Map(),
    });
  }

  return studentMap;
}

type ProjectAllocationEntry = { projectId: number; teamId: number; teamName: string; userId: number };

function flattenProjectAllocations(
  projects: Array<{ id: number; teams: Array<{ id: number; teamName: string; allocations: Array<{ userId: number }> }> }>,
): ProjectAllocationEntry[] {
  return projects.flatMap((project) =>
    project.teams.flatMap((team) =>
      team.allocations.map((allocation) => ({
        projectId: project.id,
        teamId: team.id,
        teamName: team.teamName,
        userId: allocation.userId,
      })),
    ),
  );
}

async function addMissingAllocatedStudents(
  studentMap: Map<number, MatrixStudentRow>,
  projects: Array<{ id: number; teams: Array<{ id: number; teamName: string; allocations: Array<{ userId: number }> }> }>,
): Promise<void> {
  const allocatedUserIds = new Set(flattenProjectAllocations(projects).map((entry) => entry.userId));
  const missingUserIds = [...allocatedUserIds].filter((userId) => !studentMap.has(userId));
  if (missingUserIds.length === 0) {
    return;
  }

  const missingUsers = await prisma.user.findMany({
    where: { id: { in: missingUserIds } },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  for (const user of missingUsers) {
    studentMap.set(user.id, {
      userId: user.id,
      email: user.email,
      displayName: toDisplayName(user.firstName, user.lastName),
      cells: new Map(),
    });
  }
}

function applyProjectAllocations(
  studentMap: Map<number, MatrixStudentRow>,
  projects: Array<{ id: number; teams: Array<{ id: number; teamName: string; allocations: Array<{ userId: number }> }> }>,
): void {
  const allocations = flattenProjectAllocations(projects);
  for (const allocation of allocations) {
    const row = studentMap.get(allocation.userId);
    if (!row) {
      continue;
    }

    const nextCell = { teamId: allocation.teamId, teamName: allocation.teamName };
    row.cells.set(allocation.projectId, pickBetterCell(row.cells.get(allocation.projectId), nextCell));
  }
}

function sortProjects(projects: Array<{ id: number; name: string }>): ModuleStudentProjectMatrixProject[] {
  return [...projects].sort((left, right) => left.name.localeCompare(right.name));
}

function buildMatrixStudents(
  studentMap: Map<number, MatrixStudentRow>,
  projects: ModuleStudentProjectMatrixProject[],
): ModuleStudentProjectMatrixStudent[] {
  return Array.from(studentMap.values())
    .sort((left, right) => {
      const byName = left.displayName.localeCompare(right.displayName);
      if (byName !== 0) {
        return byName;
      }
      return left.userId - right.userId;
    })
    .map((row) => ({
      userId: row.userId,
      email: row.email,
      displayName: row.displayName,
      teamCells: projects.map((project) => row.cells.get(project.id) ?? null),
    }));
}

export async function getModuleStudentProjectMatrixForUser(
  userId: number,
  moduleId: number,
): Promise<
  | { ok: true; projects: ModuleStudentProjectMatrixProject[]; students: ModuleStudentProjectMatrixStudent[] }
  | { ok: false; status: 403 }
> {
  const user = await findModuleAccessUser(userId);
  if (!user) {
    return { ok: false, status: 403 };
  }

  const moduleRow = await findAccessibleModuleForMatrix(user, moduleId);
  if (!moduleRow) {
    return { ok: false, status: 403 };
  }

  const studentMap = initializeStudentRows(moduleRow.userModules);
  await addMissingAllocatedStudents(studentMap, moduleRow.projects);
  applyProjectAllocations(studentMap, moduleRow.projects);

  const projects = sortProjects(moduleRow.projects);
  const students = buildMatrixStudents(studentMap, projects);
  return { ok: true, projects, students };
}
