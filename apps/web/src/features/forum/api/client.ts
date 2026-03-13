import { apiFetch } from "@/shared/api/http";
import type { DiscussionPost, ForumSettings } from "../types";

export async function getDiscussionPosts(userId: number, projectId: number): Promise<DiscussionPost[]> {
  return apiFetch<DiscussionPost[]>(`/forum/projects/${projectId}/posts?userId=${userId}`, {
    cache: "no-store",
  });
}

export async function createDiscussionPost(
  userId: number,
  projectId: number,
  payload: { title: string; body: string }
): Promise<DiscussionPost> {
  return apiFetch<DiscussionPost>(`/forum/projects/${projectId}/posts`, {
    method: "POST",
    body: JSON.stringify({ userId, ...payload }),
  });
}

export async function getDiscussionPost(
  userId: number,
  projectId: number,
  postId: number
): Promise<DiscussionPost> {
  return apiFetch<DiscussionPost>(`/forum/projects/${projectId}/posts/${postId}?userId=${userId}`);
}

export async function updateDiscussionPost(
  userId: number,
  projectId: number,
  postId: number,
  payload: { title: string; body: string }
): Promise<DiscussionPost> {
  return apiFetch<DiscussionPost>(`/forum/projects/${projectId}/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify({ userId, ...payload }),
  });
}

export async function deleteDiscussionPost(
  userId: number,
  projectId: number,
  postId: number
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/forum/projects/${projectId}/posts/${postId}?userId=${userId}`, {
    method: "DELETE",
  });
}

export async function reportDiscussionPost(
  userId: number,
  projectId: number,
  postId: number,
  reason?: string
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/forum/projects/${projectId}/posts/${postId}/report`, {
    method: "POST",
    body: JSON.stringify({ userId, reason }),
  });
}

export async function getForumSettings(userId: number, projectId: number): Promise<ForumSettings> {
  return apiFetch<ForumSettings>(`/forum/projects/${projectId}/settings?userId=${userId}`, {
    cache: "no-store",
  });
}

export async function updateForumSettings(
  userId: number,
  projectId: number,
  forumIsAnonymous: boolean
): Promise<ForumSettings> {
  return apiFetch<ForumSettings>(`/forum/projects/${projectId}/settings`, {
    method: "PUT",
    body: JSON.stringify({ userId, forumIsAnonymous }),
  });
}
