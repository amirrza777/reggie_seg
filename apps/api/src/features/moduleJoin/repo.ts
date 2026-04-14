import { prisma } from "../../shared/db.js";

export type ModuleJoinActor = {
  id: number;
  enterpriseId: string;
  role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
};

export async function findJoinActor(userId: number): Promise<ModuleJoinActor | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      enterpriseId: true,
      role: true,
    },
  });
}

export async function findJoinableModuleByCode(enterpriseId: string, joinCode: string) {
  return prisma.module.findFirst({
    where: {
      enterpriseId,
      joinCode,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function insertModuleEnrollment(enterpriseId: string, userId: number, moduleId: number) {
  const inserted = await prisma.userModule.createMany({
    data: [{ enterpriseId, userId, moduleId }],
    skipDuplicates: true,
  });

  return inserted.count > 0;
}

function staffModuleJoinCodeViewWhere(input: { userId: number; roleCanManageAll: boolean }) {
  if (input.roleCanManageAll) {
    return {};
  }
  return {
    OR: [
      { moduleLeads: { some: { userId: input.userId } } },
      { moduleTeachingAssistants: { some: { userId: input.userId } } },
    ],
  };
}

export async function getAuthorizedModuleJoinCode(input: {
  enterpriseId: string;
  moduleId: number;
  userId: number;
  role: string;
}) {
  const roleCanManageAll = input.role === "ADMIN" || input.role === "ENTERPRISE_ADMIN";

  return prisma.module.findFirst({
    where: {
      id: input.moduleId,
      enterpriseId: input.enterpriseId,
      ...staffModuleJoinCodeViewWhere({ userId: input.userId, roleCanManageAll }),
    },
    select: { id: true, joinCode: true },
  });
}

export async function getAuthorizedModuleForJoinCodeMutation(input: {
  enterpriseId: string;
  moduleId: number;
  userId: number;
  role: string;
}) {
  const roleCanManageAll = input.role === "ADMIN" || input.role === "ENTERPRISE_ADMIN";

  return prisma.module.findFirst({
    where: {
      id: input.moduleId,
      enterpriseId: input.enterpriseId,
      ...(roleCanManageAll ? {} : { moduleLeads: { some: { userId: input.userId } } }),
    },
    select: { id: true, name: true, enterpriseId: true, joinCode: true },
  });
}

export async function updateModuleJoinCode(moduleId: number, enterpriseId: string, joinCode: string) {
  await prisma.module.update({
    where: { id_enterpriseId: { id: moduleId, enterpriseId } },
    data: { joinCode },
  });

  return prisma.module.findFirst({
    where: { id: moduleId, enterpriseId },
    select: {
      id: true,
      name: true,
      enterpriseId: true,
      joinCode: true,
    },
  });
}
