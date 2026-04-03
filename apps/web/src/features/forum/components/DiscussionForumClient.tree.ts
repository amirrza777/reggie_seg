import type { DiscussionPost } from "@/features/forum/types";

type ResolvedForumRole = NonNullable<DiscussionPost["author"]["forumRole"]>;

const AUTHOR_ROLE_META: Record<ResolvedForumRole, { label: string; variant: string }> = {
  STUDENT: { label: "Student", variant: "student" },
  MODULE_LEAD: { label: "Module Lead", variant: "module-lead" },
  TEACHING_ASSISTANT: { label: "Teaching Assistant", variant: "teaching-assistant" },
  STAFF: { label: "Staff", variant: "staff" },
  ADMIN: { label: "Admin", variant: "admin" },
  ENTERPRISE_ADMIN: { label: "Enterprise Admin", variant: "enterprise-admin" },
};

export function getAuthorRoleMeta(author: DiscussionPost["author"]) {
  const resolvedRole: ResolvedForumRole = author.forumRole ?? author.role;
  return AUTHOR_ROLE_META[resolvedRole];
}

export function compareRepliesByScore(a: DiscussionPost, b: DiscussionPost) {
  const aIsNonStudent = a.author.role !== "STUDENT";
  const bIsNonStudent = b.author.role !== "STUDENT";
  if (aIsNonStudent !== bIsNonStudent) {
    return aIsNonStudent ? -1 : 1;
  }
  if (b.reactionScore !== a.reactionScore) {
    return b.reactionScore - a.reactionScore;
  }
  const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (createdDiff !== 0) return createdDiff;
  return a.id - b.id;
}

export function normalizeReplyOrder(post: DiscussionPost): DiscussionPost {
  if (post.replies.length === 0) return post;
  return {
    ...post,
    replies: post.replies.map(normalizeReplyOrder).sort(compareRepliesByScore),
  };
}

export function addReplyToTree(items: DiscussionPost[], parentPostId: number, reply: DiscussionPost): DiscussionPost[] {
  return items.map((post) => {
    if (post.id === parentPostId) {
      return { ...post, replies: [...post.replies, normalizeReplyOrder(reply)].sort(compareRepliesByScore) };
    }
    if (post.replies.length === 0) return post;
    return { ...post, replies: addReplyToTree(post.replies, parentPostId, reply).sort(compareRepliesByScore) };
  });
}

export function findPostPath(items: DiscussionPost[], postId: number, trail: number[] = []): number[] | null {
  for (const post of items) {
    const nextTrail = [...trail, post.id];
    if (post.id === postId) {
      return nextTrail;
    }
    if (post.replies.length === 0) continue;
    const nestedMatch = findPostPath(post.replies, postId, nextTrail);
    if (nestedMatch) {
      return nestedMatch;
    }
  }
  return null;
}

export function updatePostInTree(items: DiscussionPost[], updated: DiscussionPost): DiscussionPost[] {
  return items.map((post) => {
    if (post.id === updated.id) {
      return normalizeReplyOrder(updated);
    }
    if (post.replies.length === 0) return post;
    return { ...post, replies: updatePostInTree(post.replies, updated).sort(compareRepliesByScore) };
  });
}

export function updateReportStatusInTree(
  items: DiscussionPost[],
  postId: number,
  status: DiscussionPost["myStudentReportStatus"]
): DiscussionPost[] {
  return items.map((post) => {
    if (post.id === postId) {
      return { ...post, myStudentReportStatus: status ?? null };
    }
    if (post.replies.length === 0) return post;
    return { ...post, replies: updateReportStatusInTree(post.replies, postId, status) };
  });
}

export function removePostFromTree(items: DiscussionPost[], postId: number): DiscussionPost[] {
  return items
    .filter((post) => post.id !== postId)
    .map((post) => ({
      ...post,
      replies: post.replies.length ? removePostFromTree(post.replies, postId) : post.replies,
    }));
}

export function collectDescendantIds(post: DiscussionPost): number[] {
  const descendants: number[] = [];
  const stack = [...post.replies];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    descendants.push(current.id);
    if (current.replies.length > 0) {
      stack.push(...current.replies);
    }
  }

  return descendants;
}
