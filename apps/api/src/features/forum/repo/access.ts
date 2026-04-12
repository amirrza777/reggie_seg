import { prisma } from "../../../shared/db.js";

async function isUserTeamMemberInProject(userId: number, projectId: number) {
  return prisma.project.findFirst({
    where: { id: projectId, teams: { some: { allocations: { some: { userId } } } } },
    select: { id: true },
  });
}

async function isUserModuleLeadInProject(userId: number, projectId: number) {
  return prisma.project.findFirst({
    where: { id: projectId, module: { moduleLeads: { some: { userId } } } },
    select: { id: true },
  });
}

async function isUserModuleAssistantInProject(userId: number, projectId: number) {
  return prisma.project.findFirst({
    where: { id: projectId, module: { moduleTeachingAssistants: { some: { userId } } } },
    select: { id: true },
  });
}

async function isUserEnterpriseAdminInProject(userId: number, projectId: number) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      module: { enterprise: { users: { some: { id: userId, role: { in: ["ADMIN", "ENTERPRISE_ADMIN"] } } } } },
    },
    select: { id: true },
  });
}

export async function isUserInProject(userId: number, projectId: number) {
  const [isTeamMember, isLead, isAssistant, isEnterpriseAdmin] = await Promise.all([
    isUserTeamMemberInProject(userId, projectId),
    isUserModuleLeadInProject(userId, projectId),
    isUserModuleAssistantInProject(userId, projectId),
    isUserEnterpriseAdminInProject(userId, projectId),
  ]);
  return Boolean(isTeamMember || isLead || isAssistant || isEnterpriseAdmin);
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
  const [allocations, project] = await Promise.all([
    prisma.teamAllocation.findMany({
      where: {
        team: {
          projectId,
          archivedAt: null,
          allocationLifecycle: "ACTIVE",
        },
      },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        module: {
          select: {
            moduleLeads: { select: { user: { select: { id: true, firstName: true, lastName: true, role: true } } } },
            moduleTeachingAssistants: { select: { user: { select: { id: true, firstName: true, lastName: true, role: true } } } },
          },
        },
      },
    }),
  ]);

  const students = allocations.map((a) => ({ ...a.user, projectRole: undefined as string | undefined }));
  const leads = project?.module.moduleLeads.map((l) => ({ ...l.user, projectRole: "Module Lead" })) ?? [];
  const tas = project?.module.moduleTeachingAssistants.map((t) => ({ ...t.user, projectRole: "TA" })) ?? [];
  const seen = new Set<number>();
  return [...leads, ...tas, ...students].filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
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
