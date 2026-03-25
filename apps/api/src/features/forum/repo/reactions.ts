import { prisma } from "../../../shared/db.js";
import { isUserInProject } from "./access.js";
import { getDiscussionPostById } from "./posts.js";

type ReactionResult =
  | { status: "ok"; post: NonNullable<Awaited<ReturnType<typeof getDiscussionPostById>>> }
  | { status: "forbidden" }
  | { status: "not_found" };

export async function setDiscussionPostReaction(
  userId: number,
  projectId: number,
  postId: number,
  type: "LIKE" | "DISLIKE"
): Promise<ReactionResult> {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return { status: "forbidden" };

  const post = await prisma.discussionPost.findFirst({
    where: { id: postId, projectId },
    select: { id: true, authorId: true },
  });
  if (!post) return { status: "not_found" };

  const existing = await prisma.forumReaction.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true, type: true },
  });

  if (!existing) {
    await prisma.forumReaction.create({
      data: { postId, userId, type },
    });
  } else if (existing.type === type) {
    await prisma.forumReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.forumReaction.update({
      where: { id: existing.id },
      data: { type },
    });
  }

  const updatedPost = await getDiscussionPostById(userId, projectId, postId);
  if (!updatedPost) return { status: "not_found" };
  return { status: "ok", post: updatedPost };
}
