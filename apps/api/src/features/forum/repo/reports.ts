import { prisma } from "../../../shared/db.js";
import { canManageForumSettings } from "./access.js";

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
      parentPostId: true,
      authorId: true,
      title: true,
      body: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!post) return { status: "not_found" };

  await prisma.forumReport.create({
    data: {
      projectId,
      postId: post.id,
      reporterId: userId,
      authorId: post.authorId,
      parentPostId: post.parentPostId,
      reason: reason?.trim() || null,
      title: post.title,
      body: post.body,
      postCreatedAt: post.createdAt,
      postUpdatedAt: post.updatedAt,
    },
  });

  return { status: "ok" };
}
