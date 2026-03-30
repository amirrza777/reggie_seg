import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import type {
  ManualAllocationStudent,
  ModuleStudent,
  ProjectTeamSummary,
  StaffScopedActorRole,
  StaffScopedProject,
  StaffScopedProjectAccess,
} from "./repo.types.js";

async function buildProjectStudentScope(projectId: number): Promise<Prisma.UserWhereInput> {
  const hasProjectStudents = await prisma.projectStudent.findFirst({
    where: { projectId },
    select: { userId: true },
  });
  if (!hasProjectStudents) return {};
  return {
    projectStudents: {
      some: {
        projectId,
      },
    },
  };
}

export async function findStaffScopedProject(
  staffId: number,
  projectId: number,
): Promise<StaffScopedProject | null> {
  const user = await prisma.user.findUnique({
    where: { id: staffId },
    select: { enterpriseId: true, role: true, active: true },
  });

  if (!user || user.active === false) {
    return null;
  }

  const role = user.role as StaffScopedActorRole;

  const hasEnterpriseWideAccess = role === "ADMIN" || role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: user.enterpriseId,
        ...(hasEnterpriseWideAccess
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId: staffId } } },
                { moduleTeachingAssistants: { some: { userId: staffId } } },
              ],
            }),
      },
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      archivedAt: true,
      module: {
        select: { name: true },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
    moduleId: project.moduleId,
    moduleName: project.module.name,
    archivedAt: project.archivedAt,
    enterpriseId: user.enterpriseId,
  };
}

export async function findStaffScopedProjectAccess(
  staffId: number,
  projectId: number,
): Promise<StaffScopedProjectAccess | null> {
  const user = await prisma.user.findUnique({
    where: { id: staffId },
    select: { enterpriseId: true, role: true, active: true },
  });

  if (!user || user.active === false) {
    return null;
  }

  const role = user.role as StaffScopedActorRole;

  const hasEnterpriseWideAccess = role === "ADMIN" || role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: user.enterpriseId,
        ...(hasEnterpriseWideAccess
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId: staffId } } },
                { moduleTeachingAssistants: { some: { userId: staffId } } },
              ],
            }),
      },
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      archivedAt: true,
      module: {
        select: {
          name: true,
          moduleLeads: {
            where: { userId: staffId },
            select: { userId: true },
            take: 1,
          },
          moduleTeachingAssistants: {
            where: { userId: staffId },
            select: { userId: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  const isModuleLead = project.module.moduleLeads.length > 0;
  const isModuleTeachingAssistant = project.module.moduleTeachingAssistants.length > 0;

  return {
    id: project.id,
    name: project.name,
    moduleId: project.moduleId,
    moduleName: project.module.name,
    archivedAt: project.archivedAt,
    enterpriseId: user.enterpriseId,
    actorRole: role === "STUDENT" ? "STAFF" : role,
    isModuleLead,
    isModuleTeachingAssistant,
    canApproveAllocationDrafts: isModuleLead,
  };
}

export async function findVacantModuleStudentsForProject(
  enterpriseId: string,
  moduleId: number,
  projectId: number,
): Promise<ModuleStudent[]> {
  const projectStudentScope = await buildProjectStudentScope(projectId);
  return prisma.user.findMany({
    where: {
      enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
      teamAllocations: {
        none: {
          team: {
            projectId,
            archivedAt: null,
          },
        },
      },
      ...projectStudentScope,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });
}

export async function findModuleStudentsForManualAllocation(
  enterpriseId: string,
  moduleId: number,
  projectId: number,
  searchQuery?: string,
): Promise<ManualAllocationStudent[]> {
  const normalizedSearchQuery = typeof searchQuery === "string" ? searchQuery.trim() : "";
  const searchFilters: Prisma.UserWhereInput[] = [];
  const projectStudentScope = await buildProjectStudentScope(projectId);
  if (normalizedSearchQuery.length > 0) {
    const queryFilters: Prisma.UserWhereInput[] = [
      { email: { contains: normalizedSearchQuery } },
      { firstName: { contains: normalizedSearchQuery } },
      { lastName: { contains: normalizedSearchQuery } },
    ];
    const numericQuery = Number(normalizedSearchQuery);
    if (Number.isInteger(numericQuery) && numericQuery > 0) {
      queryFilters.push({ id: numericQuery });
    }
    searchFilters.push({ OR: queryFilters });
  }

  const students = await prisma.user.findMany({
    where: {
      enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
      ...(searchFilters.length > 0 ? { AND: searchFilters } : {}),
      ...projectStudentScope,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      teamAllocations: {
        where: {
          team: {
            projectId,
            archivedAt: null,
          },
        },
        select: {
          team: {
            select: {
              id: true,
              teamName: true,
            },
          },
        },
        orderBy: {
          teamId: "asc",
        },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });

  return students.map((student) => {
    const currentTeam = student.teamAllocations[0]?.team ?? null;

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      currentTeamId: currentTeam?.id ?? null,
      currentTeamName: currentTeam?.teamName ?? null,
    };
  });
}

export async function findProjectTeamSummaries(projectId: number): Promise<ProjectTeamSummary[]> {
  const teams = await prisma.team.findMany({
    where: { projectId, archivedAt: null, allocationLifecycle: "ACTIVE" },
    select: {
      id: true,
      teamName: true,
      _count: {
        select: { allocations: true },
      },
    },
    orderBy: [{ teamName: "asc" }, { id: "asc" }],
  });

  return teams.map((team) => ({
    id: team.id,
    teamName: team.teamName,
    memberCount: team._count.allocations,
  }));
}
