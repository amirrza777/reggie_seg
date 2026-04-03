import { prisma } from "../../../shared/db.js";
import { assertProjectMutableForWritesByProjectId } from "../../../shared/projectWriteGuard.js";

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

async function getStaffProjectNavFlagsSettingsScope(actorUserId: number, projectId: number) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  const isStaffLead = actor.role === "STAFF";
  if (!roleCanAccessAll && !isStaffLead) {
    throw { code: "FORBIDDEN", message: "Only module leads can update project feature flags" };
  }

  const projectInEnterprise = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: actor.enterpriseId,
      },
    },
    select: { id: true },
  });

  if (!projectInEnterprise) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  if (!roleCanAccessAll) {
    const leadAccess = await prisma.project.findFirst({
      where: {
        id: projectId,
        module: {
          enterpriseId: actor.enterpriseId,
          moduleLeads: { some: { userId: actorUserId } },
        },
      },
      select: { id: true },
    });

    if (!leadAccess) {
      throw { code: "FORBIDDEN", message: "Only module leads can update project feature flags" };
    }
  }

  return projectInEnterprise;
}

export async function getStaffProjectNavFlagsConfig(actorUserId: number, projectId: number) {
  const scope = await getStaffProjectNavFlagsSettingsScope(actorUserId, projectId);
  return prisma.project.findUnique({
    where: { id: scope.id },
    select: {
      id: true,
      name: true,
      projectNavFlags: true,
      deadline: {
        select: {
          assessmentOpenDate: true,
          feedbackOpenDate: true,
        },
      },
    },
  });
}

export async function updateStaffProjectNavFlagsConfig(
  actorUserId: number,
  projectId: number,
  projectNavFlags: unknown,
) {
  const scope = await getStaffProjectNavFlagsSettingsScope(actorUserId, projectId);
  await assertProjectMutableForWritesByProjectId(scope.id);
  return prisma.project.update({
    where: { id: scope.id },
    data: { projectNavFlags: projectNavFlags as any },
    select: {
      id: true,
      name: true,
      projectNavFlags: true,
      deadline: {
        select: {
          assessmentOpenDate: true,
          feedbackOpenDate: true,
        },
      },
    },
  });
}
