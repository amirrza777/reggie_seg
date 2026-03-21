import { prisma } from "../../shared/db.js";

export async function isUserInProject(userId: number, projectId: number) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        {
          teams: {
            some: {
              allocations: {
                some: {
                  userId,
                },
              },
            },
          },
        },
        {
          module: {
            moduleLeads: {
              some: {
                userId,
              },
            },
          },
        },
        {
          module: {
            moduleTeachingAssistants: {
              some: {
                userId,
              },
            },
          },
        },
        {
          module: {
            enterprise: {
              users: {
                some: {
                  id: userId,
                  role: {
                    in: ["ADMIN", "ENTERPRISE_ADMIN"],
                  },
                },
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(project);
}

export async function getUserRole(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role ?? null;
}

export async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

export async function canManageForumSettings(userId: number, projectId: number) {
  const user = await getScopedStaffUser(userId);
  if (!user) return false;

  const roleCanAccessAll = user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: user.enterpriseId,
        ...(roleCanAccessAll
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId } } },
                { moduleTeachingAssistants: { some: { userId } } },
              ],
            }),
      },
    },
    select: { id: true },
  });

  return Boolean(project);
}
