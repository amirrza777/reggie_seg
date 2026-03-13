import { prisma } from "../../shared/db.js";

async function isUserInProject(userId: number, projectId: number) {
  const enrollment = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: { projectId },
    },
    select: { teamId: true },
  });

  return Boolean(enrollment);
}

export async function getDiscussionPostsForProject(userId: number, projectId: number) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return null;

  return prisma.discussionPost.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

export async function createDiscussionPostForProject(
  userId: number,
  projectId: number,
  title: string,
  body: string
) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return null;

  return prisma.discussionPost.create({
    data: {
      projectId,
      authorId: userId,
      title,
      body,
    },
    select: {
      id: true,
      title: true,
      body: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}
