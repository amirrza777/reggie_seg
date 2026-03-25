import { prisma } from "../../../shared/db.js";
import { canManageForumSettings, isUserInProject } from "./access.js";

type ForumAuthor = { id: number; firstName: string; lastName: string; role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN" };

function mapForumAuthor(author: ForumAuthor, hideStudentNames: boolean, viewerId: number) {
  const shouldHide = hideStudentNames && author.role === "STUDENT" && author.id !== viewerId;
  return {
    id: author.id,
    firstName: shouldHide ? "Anonymous" : author.firstName,
    lastName: shouldHide ? "Student" : author.lastName,
    role: author.role,
  };
}

export type EnrichedPost = {
  id: number;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  parentPostId: number | null;
  author: ForumAuthor;
  reactionScore: number;
  myReaction: "LIKE" | "DISLIKE" | null;
  replies: EnrichedPost[];
};

export function buildPostTree(posts: EnrichedPost[]) {
  const byId = new Map<number, EnrichedPost>();
  for (const post of posts) {
    byId.set(post.id, { ...post, replies: [] });
  }

  const roots: EnrichedPost[] = [];
  for (const post of byId.values()) {
    if (post.parentPostId) {
      const parent = byId.get(post.parentPostId);
      if (parent) {
        parent.replies.push(post);
      } else {
        roots.push(post);
      }
    } else {
      roots.push(post);
    }
  }

  const sortReplies = (items: EnrichedPost[]) => {
    items.sort((a, b) => {
      if (b.reactionScore !== a.reactionScore) {
        return b.reactionScore - a.reactionScore;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    for (const item of items) {
      if (item.replies.length > 0) sortReplies(item.replies);
    }
  };

  sortReplies(roots);
  roots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { roots, byId };
}

export async function getFlatPostsForProject(userId: number, projectId: number) {
  const [posts, project, reports, myStudentReports] = await Promise.all([
    prisma.discussionPost.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        parentPostId: true,
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
    prisma.forumReport.findMany({
      where: { projectId },
      select: { postId: true },
    }),
    prisma.forumStudentReport.findMany({
      where: { projectId, reporterId: userId },
      select: { postId: true, status: true },
    }),
  ]);

  const reportedIds = new Set<number>(reports.map((report) => report.postId));
  if (reportedIds.size > 0) {
    const childrenByParent = new Map<number | null, number[]>();
    for (const post of posts) {
      const bucket = childrenByParent.get(post.parentPostId ?? null) ?? [];
      bucket.push(post.id);
      childrenByParent.set(post.parentPostId ?? null, bucket);
    }

    const queue = [...reportedIds];
    while (queue.length > 0) {
      const current = queue.pop();
      if (!current) continue;
      const children = childrenByParent.get(current) ?? [];
      for (const childId of children) {
        if (!reportedIds.has(childId)) {
          reportedIds.add(childId);
          queue.push(childId);
        }
      }
    }
  }

  const visiblePosts = reportedIds.size ? posts.filter((post) => !reportedIds.has(post.id)) : posts;

  const postIds = visiblePosts.map((post) => post.id);
  if (postIds.length === 0) {
    return [];
  }
  const [myReactions, reactionCounts] = await Promise.all([
    prisma.forumReaction.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true, type: true },
    }),
    prisma.forumReaction.groupBy({
      by: ["postId", "type"],
      where: { postId: { in: postIds } },
      _count: { _all: true },
    }),
  ]);

  const reactionByPostId = new Map<number, "LIKE" | "DISLIKE">(
    myReactions.map((reaction) => [reaction.postId, reaction.type])
  );
  const countsByPostId = new Map<number, { likeCount: number; dislikeCount: number }>();
  for (const entry of reactionCounts) {
    const existing = countsByPostId.get(entry.postId) ?? { likeCount: 0, dislikeCount: 0 };
    if (entry.type === "LIKE") existing.likeCount = entry._count._all;
    if (entry.type === "DISLIKE") existing.dislikeCount = entry._count._all;
    countsByPostId.set(entry.postId, existing);
  }

  const hideStudentNames = project?.forumIsAnonymous ?? false;
  const studentReportByPostId = new Map<number, "PENDING" | "APPROVED" | "IGNORED">(
    myStudentReports.map((report) => [report.postId, report.status])
  );

  return visiblePosts.map((post) => {
    const counts = countsByPostId.get(post.id) ?? { likeCount: 0, dislikeCount: 0 };
    const score = counts.likeCount - counts.dislikeCount;
    return {
      ...post,
      author: mapForumAuthor(post.author, hideStudentNames, userId),
      reactionScore: score,
      myReaction: reactionByPostId.get(post.id) ?? null,
      myStudentReportStatus: studentReportByPostId.get(post.id) ?? null,
      replies: [],
    };
  });
}

export async function getDiscussionPostsForProject(userId: number, projectId: number) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return null;

  const posts = await getFlatPostsForProject(userId, projectId);
  return buildPostTree(posts).roots;
}

export async function getDiscussionPostById(userId: number, projectId: number, postId: number) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return null;

  const report = await prisma.forumReport.findFirst({
    where: { postId, projectId },
    select: { id: true },
  });
  if (report) return null;

  const posts = await getFlatPostsForProject(userId, projectId);
  const { byId } = buildPostTree(posts);
  return byId.get(postId) ?? null;
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
  body: string,
  parentPostId?: number | null
) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return null;

  if (parentPostId) {
    const [parent, report] = await Promise.all([
      prisma.discussionPost.findFirst({
        where: { id: parentPostId, projectId },
        select: { id: true },
      }),
      prisma.forumReport.findFirst({
        where: { postId: parentPostId, projectId },
        select: { id: true },
      }),
    ]);
    if (!parent) return null;
    if (report) return null;
  }

  const created = await prisma.discussionPost.create({
    data: {
      projectId,
      authorId: userId,
      title,
      body,
      parentPostId: parentPostId ?? null,
    },
    select: { id: true },
  });

  return getDiscussionPostById(userId, projectId, created.id);
}

type PostMutationResult =
  | {
      status: "ok";
      post: Omit<EnrichedPost, "parentPostId" | "reactionScore" | "myReaction" | "replies">;
    }
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

export async function getStaffConversationForPost(userId: number, projectId: number, postId: number) {
  const canManage = await canManageForumSettings(userId, projectId);
  if (!canManage) return null;

  const posts = await getFlatPostsForProject(userId, projectId);
  const { byId } = buildPostTree(posts);
  const focus = byId.get(postId);
  if (!focus) return { focusPostId: postId, thread: null, missingPost: true };

  let root = focus;
  while (root.parentPostId && byId.get(root.parentPostId)) {
    root = byId.get(root.parentPostId) as EnrichedPost;
  }

  return { focusPostId: postId, thread: root, missingPost: false };
}