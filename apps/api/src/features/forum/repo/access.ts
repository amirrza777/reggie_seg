import { prisma } from "../../../shared/db.js";

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

export async function getUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
}

export async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

export async function getDiscussionPostAuthorId(postId: number, projectId: number) {
  const post = await prisma.discussionPost.findFirst({
    where: { id: postId, projectId },
    select: { authorId: true },
  });
  return post?.authorId ?? null;
}

export async function getModuleLeadsForProject(projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { moduleId: true },
  });
  if (!project) return [];
  return prisma.moduleLead.findMany({
    where: { moduleId: project.moduleId },
    select: { userId: true },
  });
}

export async function getProjectMembers(projectId: number) {
  const allocations = await prisma.teamAllocation.findMany({
    where: {
      team: {
        projectId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
    select: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  return allocations.map((a) => a.user);
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
