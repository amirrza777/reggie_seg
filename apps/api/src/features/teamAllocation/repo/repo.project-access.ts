import { prisma } from "../../shared/db.js";
import type {
  StaffScopedActorRole,
  StaffScopedProject,
  StaffScopedProjectAccess,
} from "./repo.types.js";

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
        select: { name: true, archivedAt: true },
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
    moduleArchivedAt: project.module.archivedAt,
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
          archivedAt: true,
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
    moduleArchivedAt: project.module.archivedAt,
    enterpriseId: user.enterpriseId,
    actorRole: role === "STUDENT" ? "STAFF" : role,
    isModuleLead,
    isModuleTeachingAssistant,
    canApproveAllocationDrafts: isModuleLead,
  };
}