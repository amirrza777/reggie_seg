import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db.js";
import { assertProjectMutableForWritesByProjectId } from "../../../shared/projectWriteGuard.js";

const MAX_PROJECT_NAME_LENGTH = 200;

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

export async function getStaffProjectManageScope(actorUserId: number, projectId: number) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN" as const, message: "User not found" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  const isStaffLead = actor.role === "STAFF";
  if (!roleCanAccessAll && !isStaffLead) {
    throw {
      code: "FORBIDDEN" as const,
      message: "Only module leads and admins can manage project settings",
    };
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
    throw { code: "PROJECT_NOT_FOUND" as const };
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
      throw {
        code: "FORBIDDEN" as const,
        message: "Only module leads and admins can manage project settings",
      };
    }
  }

  return projectInEnterprise;
}

export async function getStaffProjectManageSummary(actorUserId: number, projectId: number) {
  await getStaffProjectManageScope(actorUserId, projectId);
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      archivedAt: true,
      moduleId: true,
      module: { select: { archivedAt: true } },
    },
  });
}

export type StaffProjectManagePatch = {
  name?: string;
  archived?: boolean;
};

export async function patchStaffProjectManage(
  actorUserId: number,
  projectId: number,
  body: StaffProjectManagePatch,
) {
  const scope = await getStaffProjectManageScope(actorUserId, projectId);
  const hasName = body.name !== undefined;
  const hasArchived = body.archived !== undefined;

  if (!hasName && !hasArchived) {
    throw { code: "EMPTY_PATCH" as const, message: "No updates provided" };
  }

  const data: Prisma.ProjectUpdateInput = {};

  if (hasName) {
    await assertProjectMutableForWritesByProjectId(scope.id);
    const normalized = typeof body.name === "string" ? body.name.trim() : "";
    if (!normalized) {
      throw { code: "INVALID_NAME" as const, message: "Project name is required" };
    }
    if (normalized.length > MAX_PROJECT_NAME_LENGTH) {
      throw {
        code: "INVALID_NAME" as const,
        message: `Project name must be at most ${MAX_PROJECT_NAME_LENGTH} characters`,
      };
    }
    data.name = normalized;
  }

  if (hasArchived) {
    if (body.archived) {
      data.archivedAt = new Date();
    } else {
      const row = await prisma.project.findUnique({
        where: { id: scope.id },
        select: { module: { select: { archivedAt: true } } },
      });
      if (row?.module.archivedAt) {
        throw {
          code: "MODULE_ARCHIVED" as const,
          message: "Cannot unarchive this project while its module is archived",
        };
      }
      data.archivedAt = null;
    }
  }

  return prisma.project.update({
    where: { id: scope.id },
    data,
    select: {
      id: true,
      name: true,
      archivedAt: true,
      moduleId: true,
      module: { select: { archivedAt: true } },
    },
  });
}

export async function deleteStaffProjectManage(actorUserId: number, projectId: number) {
  const scope = await getStaffProjectManageScope(actorUserId, projectId);
  const row = await prisma.project.findUnique({
    where: { id: scope.id },
    select: { moduleId: true },
  });
  if (!row) {
    throw { code: "PROJECT_NOT_FOUND" as const };
  }
  await prisma.project.delete({ where: { id: scope.id } });
  return { moduleId: row.moduleId };
}
