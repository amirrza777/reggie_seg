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

export async function getDiscussionPostById(userId: number, projectId: number, postId: number) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return null;

  return prisma.discussionPost.findFirst({
    where: { id: postId, projectId },
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

type PostMutationResult =
  | { status: "ok"; post: NonNullable<Awaited<ReturnType<typeof getDiscussionPostById>>> }
  | { status: "forbidden" }
  | { status: "not_found" };

async function ensureAuthorPost(userId: number, projectId: number, postId: number): Promise<PostMutationResult> {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return { status: "forbidden" };

  const existing = await prisma.discussionPost.findFirst({
    where: { id: postId, projectId },
    select: {
      id: true,
      authorId: true,
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

  if (!existing) return { status: "not_found" };
  if (existing.authorId !== userId) return { status: "forbidden" };

  const { authorId, ...rest } = existing;
  return { status: "ok", post: rest };
}

export async function updateDiscussionPostForProject(
  userId: number,
  projectId: number,
  postId: number,
  title: string,
  body: string
): Promise<PostMutationResult> {
  const access = await ensureAuthorPost(userId, projectId, postId);
  if (access.status !== "ok") return access;

  const updated = await prisma.discussionPost.update({
    where: { id: postId },
    data: { title, body },
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

  return { status: "ok", post: updated };
}

export async function deleteDiscussionPostForProject(
  userId: number,
  projectId: number,
  postId: number
): Promise<PostMutationResult> {
  const access = await ensureAuthorPost(userId, projectId, postId);
  if (access.status !== "ok") return access;

  await prisma.discussionPost.delete({ where: { id: postId } });
  return access;
}
