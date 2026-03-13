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

  const [posts, project] = await Promise.all([
    prisma.discussionPost.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { forumIsAnonymous: true },
    }),
  ]);

  const hideStudentNames = project?.forumIsAnonymous ?? false;
  return posts.map((post) => {
    const shouldHide =
      hideStudentNames && post.author.role === "STUDENT" && post.author.id !== userId;
    return {
      ...post,
      author: {
        id: post.author.id,
        firstName: shouldHide ? "Anonymous" : post.author.firstName,
        lastName: shouldHide ? "Student" : post.author.lastName,
        role: post.author.role,
      },
    };
  });
}

export async function getDiscussionPostById(userId: number, projectId: number, postId: number) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return null;

  const [post, project] = await Promise.all([
    prisma.discussionPost.findFirst({
      where: { id: postId, projectId },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { forumIsAnonymous: true },
    }),
  ]);

  if (!post) return null;
  const hideStudentNames = project?.forumIsAnonymous ?? false;
  const shouldHide =
    hideStudentNames && post.author.role === "STUDENT" && post.author.id !== userId;
  return {
    ...post,
    author: {
      id: post.author.id,
      firstName: shouldHide ? "Anonymous" : post.author.firstName,
      lastName: shouldHide ? "Student" : post.author.lastName,
      role: post.author.role,
    },
  };
}

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

async function canManageForumSettings(userId: number, projectId: number) {
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

export async function getForumSettings(userId: number, projectId: number) {
  const canManage = await canManageForumSettings(userId, projectId);
  if (!canManage) return null;

  return prisma.project.findUnique({
    where: { id: projectId },
    select: { forumIsAnonymous: true },
  });
}

export async function updateForumSettings(userId: number, projectId: number, anonymousStudents: boolean) {
  const canManage = await canManageForumSettings(userId, projectId);
  if (!canManage) return null;

  return prisma.project.update({
    where: { id: projectId },
    data: { forumIsAnonymous: anonymousStudents },
    select: { forumIsAnonymous: true },
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

  const created = await prisma.discussionPost.create({
    data: {
      projectId,
      authorId: userId,
      title,
      body,
    },
    select: { id: true },
  });

  return getDiscussionPostById(userId, projectId, created.id);
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
      updatedAt: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
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
    select: { id: true },
  });

  const post = await getDiscussionPostById(userId, projectId, updated.id);
  if (!post) return { status: "not_found" };
  return { status: "ok", post };
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

type ReportResult =
  | { status: "ok" }
  | { status: "forbidden" }
  | { status: "not_found" };

export async function reportDiscussionPost(
  userId: number,
  projectId: number,
  postId: number,
  reason?: string | null
): Promise<ReportResult> {
  const canReport = await canManageForumSettings(userId, projectId);
  if (!canReport) return { status: "forbidden" };

  const post = await prisma.discussionPost.findFirst({
    where: { id: postId, projectId },
    select: {
      id: true,
      authorId: true,
      title: true,
      body: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!post) return { status: "not_found" };

  await prisma.$transaction([
    prisma.forumReport.create({
      data: {
        projectId,
        postId: post.id,
        reporterId: userId,
        authorId: post.authorId,
        reason: reason?.trim() || null,
        title: post.title,
        body: post.body,
        postCreatedAt: post.createdAt,
        postUpdatedAt: post.updatedAt,
      },
    }),
    prisma.discussionPost.delete({ where: { id: post.id } }),
  ]);

  return { status: "ok" };
}
