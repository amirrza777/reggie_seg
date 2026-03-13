import {
  getDiscussionPostsForProject,
  createDiscussionPostForProject,
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
