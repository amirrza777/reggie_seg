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
} from "./repo.js";

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
  return createDiscussionPostForProject(userId, projectId, title, body, parentPostId);
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
  return createStudentReport(userId, projectId, postId, reason);
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
