import { prisma } from "../../../shared/db.js";
import { canManageForumSettings, isUserInProject } from "./access.js";

type ForumAuthor = { id: number; firstName: string; lastName: string; role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN" };
type ForumDisplayRole = "STUDENT" | "MODULE_LEAD" | "TEACHING_ASSISTANT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
type ForumResolvedAuthor = ForumAuthor & { forumRole: ForumDisplayRole };

function getForumDisplayRole(
  author: ForumAuthor,
  moduleLeadIds: Set<number>,
  moduleTeachingAssistantIds: Set<number>
): ForumDisplayRole {
  if (author.role === "STUDENT") return "STUDENT";
  if (author.role === "ADMIN") return "ADMIN";
  if (author.role === "ENTERPRISE_ADMIN") return "ENTERPRISE_ADMIN";
  if (moduleLeadIds.has(author.id)) return "MODULE_LEAD";
  if (moduleTeachingAssistantIds.has(author.id)) return "TEACHING_ASSISTANT";
  return "STAFF";
}

function mapForumAuthor(
  author: ForumAuthor,
  hideStudentNames: boolean,
  viewerId: number,
  moduleLeadIds: Set<number>,
  moduleTeachingAssistantIds: Set<number>
): ForumResolvedAuthor {
  const shouldHide = hideStudentNames && author.role === "STUDENT" && author.id !== viewerId;
  return {
    id: author.id,
    firstName: shouldHide ? "Anonymous" : author.firstName,
    lastName: shouldHide ? "Student" : author.lastName,
    role: author.role,
    forumRole: getForumDisplayRole(author, moduleLeadIds, moduleTeachingAssistantIds),
  };
}

type EnrichedPost = {
  id: number;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  parentPostId: number | null;
  author: ForumResolvedAuthor;
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

async function fetchPostData(userId: number, projectId: number) {
  const [posts, project, reports, myStudentReports] = await Promise.all([
    prisma.discussionPost.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, body: true, createdAt: true, updatedAt: true, parentPostId: true, author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    }),
    prisma.project.findUnique({ where: { id: projectId }, select: { forumIsAnonymous: true, moduleId: true } }),
    prisma.forumReport.findMany({ where: { projectId }, select: { postId: true } }),
    prisma.forumStudentReport.findMany({ where: { projectId, reporterId: userId }, select: { postId: true, status: true } }),
  ]);
  return { posts, project, reports, myStudentReports };
}

function buildReportedPostsSet(posts: any[], reports: any[]) {
  const reportedIds = new Set<number>(reports.map((report) => report.postId));
  if (reportedIds.size === 0) return reportedIds;

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
  return reportedIds;
}

async function fetchReactionData(visiblePosts: any[], moduleId: number | null, authorIds: number[]) {
  const postIds = visiblePosts.map((p) => p.id);
  if (postIds.length === 0) return { myReactions: [], reactionCounts: [], moduleLeadIds: new Set(), moduleTeachingAssistantIds: new Set() };

  const queries: any[] = [
    prisma.forumReaction.findMany({ where: { postId: { in: postIds } }, select: { postId: true, userId: true, type: true } }),
    prisma.forumReaction.groupBy({ by: ["postId", "type"], where: { postId: { in: postIds } }, _count: { _all: true } }),
  ];

  if (moduleId && authorIds.length > 0) {
    queries.push(
      prisma.moduleLead.findMany({ where: { moduleId, userId: { in: authorIds } }, select: { userId: true } }),
      prisma.moduleTeachingAssistant.findMany({ where: { moduleId, userId: { in: authorIds } }, select: { userId: true } })
    );
  }

  const results = await Promise.all(queries);
  const [myReactions, reactionCounts, moduleLeadRows = [], moduleTeachingAssistantRows = []] = results;
  return { myReactions, reactionCounts, moduleLeadIds: new Set(moduleLeadRows.map((l: any) => l.userId)), moduleTeachingAssistantIds: new Set(moduleTeachingAssistantRows.map((t: any) => t.userId)) };
}

function aggregateReactionMaps(myReactions: any[], reactionCounts: any[]) {
  const reactionByPostId = new Map<number, "LIKE" | "DISLIKE">(myReactions.map((r) => [r.postId, r.type]));
  const countsByPostId = new Map<number, { likeCount: number; dislikeCount: number }>();
  for (const entry of reactionCounts) {
    const existing = countsByPostId.get(entry.postId) ?? { likeCount: 0, dislikeCount: 0 };
    if (entry.type === "LIKE") existing.likeCount = entry._count._all;
    if (entry.type === "DISLIKE") existing.dislikeCount = entry._count._all;
    countsByPostId.set(entry.postId, existing);
  }
  return { reactionByPostId, countsByPostId };
}

function enrichPostWithReactions(post: any, userId: number, countsByPostId: Map<number, any>, reactionByPostId: Map<number, any>, hideStudentNames: boolean, moduleLeadIds: Set<number>, moduleTeachingAssistantIds: Set<number>, studentReportByPostId: Map<number, any>) {
  const counts = countsByPostId.get(post.id) ?? { likeCount: 0, dislikeCount: 0 };
  const score = counts.likeCount - counts.dislikeCount;
  return {
    ...post,
    author: mapForumAuthor(post.author, hideStudentNames, userId, moduleLeadIds, moduleTeachingAssistantIds),
    reactionScore: score,
    myReaction: reactionByPostId.get(post.id) ?? null,
    myStudentReportStatus: studentReportByPostId.get(post.id) ?? null,
    replies: [],
  };
}

export async function getFlatPostsForProject(userId: number, projectId: number) {
  const { posts, project, reports, myStudentReports } = await fetchPostData(userId, projectId);
  const reportedIds = buildReportedPostsSet(posts, reports);
  const visiblePosts = reportedIds.size ? posts.filter((p) => !reportedIds.has(p.id)) : posts;

  if (visiblePosts.length === 0) return [];

  const authorIds = [...new Set(visiblePosts.map((p) => p.author.id))];
  const { myReactions, reactionCounts, moduleLeadIds, moduleTeachingAssistantIds } = await fetchReactionData(visiblePosts, project?.moduleId ?? null, authorIds);
  const { reactionByPostId, countsByPostId } = aggregateReactionMaps(myReactions, reactionCounts);
  const hideStudentNames = project?.forumIsAnonymous ?? false;
  const studentReportByPostId = new Map(myStudentReports.map((r) => [r.postId, r.status]));

  return visiblePosts.map((post) => enrichPostWithReactions(post, userId, countsByPostId, reactionByPostId, hideStudentNames, moduleLeadIds, moduleTeachingAssistantIds, studentReportByPostId));
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

/** Read-only: any project member can read anonymity flag (e.g. discussion UI) */
export async function getForumSettings(userId: number, projectId: number) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return null;

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
