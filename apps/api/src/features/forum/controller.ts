import type { Request, Response } from "express";
import {
  fetchDiscussionPosts,
  fetchDiscussionPost,
  createDiscussionPost,
  updateDiscussionPost,
  deleteDiscussionPost,
  fetchForumSettings,
  setForumSettings,
  reportForumPost,
} from "./service.js";

export async function getProjectDiscussionPostsHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);

  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const posts = await fetchDiscussionPosts(userId, projectId);
    if (!posts) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(posts);
  } catch (error) {
    console.error("Error fetching discussion posts:", error);
    res.status(500).json({ error: "Failed to fetch discussion posts" });
  }
}

export async function createProjectDiscussionPostHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const { userId, title, body } = req.body as {
    userId?: number;
    title?: string;
    body?: string;
  };

  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (typeof userId !== "number") {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  if (!title || typeof title !== "string" || !body || typeof body !== "string") {
    return res.status(400).json({ error: "Title and body are required" });
  }

  try {
    const post = await createDiscussionPost(userId, projectId, title.trim(), body.trim());
    if (!post) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(201).json(post);
  } catch (error) {
    console.error("Error creating discussion post:", error);
    res.status(500).json({ error: "Failed to create discussion post" });
  }
}

export async function getProjectDiscussionPostHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);
  const postId = Number(req.params.postId);

  if (isNaN(userId) || isNaN(projectId) || isNaN(postId)) {
    return res.status(400).json({ error: "Invalid user ID, project ID, or post ID" });
  }

  try {
    const post = await fetchDiscussionPost(userId, projectId, postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    console.error("Error fetching discussion post:", error);
    res.status(500).json({ error: "Failed to fetch discussion post" });
  }
}

export async function updateProjectDiscussionPostHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const postId = Number(req.params.postId);
  const { userId, title, body } = req.body as {
    userId?: number;
    title?: string;
    body?: string;
  };

  if (isNaN(projectId) || isNaN(postId)) {
    return res.status(400).json({ error: "Invalid project ID or post ID" });
  }
  if (typeof userId !== "number") {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  if (!title || typeof title !== "string" || !body || typeof body !== "string") {
    return res.status(400).json({ error: "Title and body are required" });
  }

  try {
    const result = await updateDiscussionPost(userId, projectId, postId, title.trim(), body.trim());
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Post not found" });
    res.json(result.post);
  } catch (error) {
    console.error("Error updating discussion post:", error);
    res.status(500).json({ error: "Failed to update discussion post" });
  }
}

export async function deleteProjectDiscussionPostHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const postId = Number(req.params.postId);
  const userId = Number(req.query.userId);

  if (isNaN(projectId) || isNaN(postId) || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid project ID, post ID, or user ID" });
  }

  try {
    const result = await deleteDiscussionPost(userId, projectId, postId);
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Post not found" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting discussion post:", error);
    res.status(500).json({ error: "Failed to delete discussion post" });
  }
}

export async function getForumSettingsHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);

  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const settings = await fetchForumSettings(userId, projectId);
    if (!settings) return res.status(403).json({ error: "Forbidden" });
    res.json(settings);
  } catch (error) {
    console.error("Error fetching forum settings:", error);
    res.status(500).json({ error: "Failed to fetch forum settings" });
  }
}

export async function updateForumSettingsHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const { userId, forumIsAnonymous } = req.body as {
    userId?: number;
    forumIsAnonymous?: boolean;
  };

  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (typeof userId !== "number") {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  if (typeof forumIsAnonymous !== "boolean") {
    return res.status(400).json({ error: "forumIsAnonymous must be boolean" });
  }

  try {
    const settings = await setForumSettings(userId, projectId, forumIsAnonymous);
    if (!settings) return res.status(403).json({ error: "Forbidden" });
    res.json(settings);
  } catch (error) {
    console.error("Error updating forum settings:", error);
    res.status(500).json({ error: "Failed to update forum settings" });
  }
}

export async function reportDiscussionPostHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const postId = Number(req.params.postId);
  const { userId, reason } = req.body as { userId?: number; reason?: string };

  if (isNaN(projectId) || isNaN(postId)) {
    return res.status(400).json({ error: "Invalid project ID or post ID" });
  }
  if (typeof userId !== "number") {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const result = await reportForumPost(userId, projectId, postId, reason);
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Post not found" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error reporting discussion post:", error);
    res.status(500).json({ error: "Failed to report discussion post" });
  }
}
