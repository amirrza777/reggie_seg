import {
  getDiscussionPostsForProject,
  createDiscussionPostForProject,
  getDiscussionPostById,
  updateDiscussionPostForProject,
  deleteDiscussionPostForProject,
  getForumSettings,
  updateForumSettings,
  reportDiscussionPost,
} from "./repo.js";

export async function fetchDiscussionPosts(userId: number, projectId: number) {
  return getDiscussionPostsForProject(userId, projectId);
}

export async function createDiscussionPost(
  userId: number,
  projectId: number,
  title: string,
  body: string
) {
  return createDiscussionPostForProject(userId, projectId, title, body);
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
