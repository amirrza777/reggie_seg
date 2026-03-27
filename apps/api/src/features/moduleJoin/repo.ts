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

export async function getManagedModuleJoinCode(enterpriseId: string, moduleId: number) {
  return prisma.module.findFirst({
    where: { id: moduleId, enterpriseId },
    select: { id: true, joinCode: true },
  });
}
