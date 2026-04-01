import {
  getDiscussionPostsForProject,
  createDiscussionPostForProject,
  getDiscussionPostById,
  updateDiscussionPostForProject,
  deleteDiscussionPostForProject,
  getForumSettings,
  updateForumSettings,
  reportDiscussionPost,
  setDiscussionPostReaction,
  createStudentReport,
  getStudentReportsForProject,
  approveStudentReport,
  ignoreStudentReport,
  getStaffConversationForPost,
  getDiscussionPostAuthorId,
  getModuleLeadsForProject,
  getUserRole,
  getUserById,
  getProjectMembers,
  isUserInProject,
} from "./repo.js";
import { addNotification } from "../notifications/service.js";
import { extractMentionsFromLexicalJSON } from "../../shared/lexical.js";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

async function processMentions(authorId: number, projectId: number, body: string) {
  const mentionedNames = extractMentionsFromLexicalJSON(body);
  if (mentionedNames.length === 0) return;

  const members = await getProjectMembers(projectId);
  const membersByName = new Map<string, typeof members>();
  for (const member of members) {
    const key = normalizeName(`${member.firstName} ${member.lastName}`);
    const group = membersByName.get(key) ?? [];
    group.push(member);
    membersByName.set(key, group);
  }

  const mentionedMembers = new Map<number, (typeof members)[number]>();
  for (const name of mentionedNames) {
    const matched = (membersByName.get(normalizeName(name)) ?? []).filter((m) => m.id !== authorId);
    // Skip ambiguous names so we don't notify the wrong person when multiple members share a full name.
    if (matched.length === 1) mentionedMembers.set(matched[0].id, matched[0]);
  }

  if (mentionedMembers.size === 0) return;

  const author = await getUserById(authorId);
  const authorName = author ? `${author.firstName} ${author.lastName}` : "Someone";

  for (const member of mentionedMembers.values()) {
    const isStaff = member.role === "STAFF" || member.role === "ADMIN" || member.role === "ENTERPRISE_ADMIN";
    const link = isStaff ? `/staff/projects/${projectId}/discussion` : `/projects/${projectId}/discussion`;
    await addNotification({
      userId: member.id,
      type: "MENTION",
      message: `${authorName} mentioned you in a discussion post`,
      link,
    });
  }
}

export async function fetchDiscussionPosts(userId: number, projectId: number) {
  return getDiscussionPostsForProject(userId, projectId);
}

export async function createDiscussionPost(
  userId: number,
  projectId: number,
  title: string,
  body: string,
  parentPostId?: number | null
) {
  const parentAuthorId = parentPostId ? await getDiscussionPostAuthorId(parentPostId, projectId) : null;
  const post = await createDiscussionPostForProject(userId, projectId, title, body, parentPostId);
  if (post) {
    try {
      await processMentions(userId, projectId, body);
    } catch (error) {
      console.error("Failed to process forum mentions:", error);
    }
  }
  if (post && parentAuthorId && parentAuthorId !== userId) {
    const parentAuthorRole = await getUserRole(parentAuthorId);
    const isStaff = parentAuthorRole === "STAFF" || parentAuthorRole === "ADMIN" || parentAuthorRole === "ENTERPRISE_ADMIN";
    const link = isStaff
      ? `/staff/projects/${projectId}/discussion`
      : `/projects/${projectId}/discussion`;
    await addNotification({
      userId: parentAuthorId,
      type: "FORUM_REPLY",
      message: "Someone replied to your forum post",
      link,
    });
  }
  return post;
}

export async function fetchDiscussionPost(userId: number, projectId: number, postId: number) {
  return getDiscussionPostById(userId, projectId, postId);
}

export async function updateDiscussionPost(
  userId: number,
  projectId: number,
  postId: number,
  title: string,
  body: string
) {
  return updateDiscussionPostForProject(userId, projectId, postId, title, body);
}

export async function deleteDiscussionPost(userId: number, projectId: number, postId: number) {
  return deleteDiscussionPostForProject(userId, projectId, postId);
}

export async function fetchForumSettings(userId: number, projectId: number) {
  return getForumSettings(userId, projectId);
}

export async function setForumSettings(userId: number, projectId: number, anonymousStudents: boolean) {
  return updateForumSettings(userId, projectId, anonymousStudents);
}

export async function reportForumPost(
  userId: number,
  projectId: number,
  postId: number,
  reason?: string | null
) {
  return reportDiscussionPost(userId, projectId, postId, reason);
}

export async function reactToDiscussionPost(
  userId: number,
  projectId: number,
  postId: number,
  type: "LIKE" | "DISLIKE"
) {
  return setDiscussionPostReaction(userId, projectId, postId, type);
}

export async function createStudentForumReport(
  userId: number,
  projectId: number,
  postId: number,
  reason?: string | null
) {
  const result = await createStudentReport(userId, projectId, postId, reason);
  if (result.status === "ok") {
    const leads = await getModuleLeadsForProject(projectId);
    await Promise.all(
      leads.map((lead) =>
        addNotification({
          userId: lead.userId,
          type: "FORUM_REPORTED",
          message: "A forum post has been reported",
          link: `/staff/projects/${projectId}/discussion`,
        })
      )
    );
  }
  return result;
}

export async function fetchStudentForumReports(userId: number, projectId: number) {
  return getStudentReportsForProject(userId, projectId);
}

export async function approveStudentForumReport(userId: number, projectId: number, reportId: number) {
  return approveStudentReport(userId, projectId, reportId);
}

export async function ignoreStudentForumReport(userId: number, projectId: number, reportId: number) {
  return ignoreStudentReport(userId, projectId, reportId);
}

export async function fetchStaffConversation(userId: number, projectId: number, postId: number) {
  return getStaffConversationForPost(userId, projectId, postId);
}

export async function fetchForumMembers(userId: number, projectId: number) {
  const inProject = await isUserInProject(userId, projectId);
  if (!inProject) return null;
  return getProjectMembers(projectId);
}
