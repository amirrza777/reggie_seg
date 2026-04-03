import type { Request, Response } from "express"
import {
  fetchDiscussionPosts,
  fetchDiscussionPost,
  createDiscussionPost,
  updateDiscussionPost,
  deleteDiscussionPost,
  fetchForumSettings,
  setForumSettings,
  reportForumPost,
  reactToDiscussionPost,
  createStudentForumReport,
  fetchStudentForumReports,
  approveStudentForumReport,
  ignoreStudentForumReport,
  fetchStaffConversation,
  fetchForumMembers,
} from "./service.js";
import {
  parseCreateDiscussionPostBody,
  parseForumSettingsBody,
  parseProjectIdParam,
  parseProjectPostUserBody,
  parseProjectReportUserBody,
  parseProjectUserPostQuery,
  parseProjectUserQuery,
  parseReactToDiscussionPostBody,
  parseUpdateDiscussionPostBody,
} from "./controller.parsers.js";

export async function getProjectDiscussionPostsHandler(req: Request, res: Response) {
  const parsed = parseProjectUserQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const posts = await fetchDiscussionPosts(parsed.value.userId, parsed.value.projectId);
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
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  const parsedBody = parseCreateDiscussionPostBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const post = await createDiscussionPost(
      parsedBody.value.userId,
      projectId.value,
      parsedBody.value.title,
      parsedBody.value.body,
      parsedBody.value.parentPostId,
    );
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
  const parsed = parseProjectUserPostQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const post = await fetchDiscussionPost(parsed.value.userId, parsed.value.projectId, parsed.value.postId);
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
  const route = parseProjectPostUserBody({
    params: req.params as any,
    body: { ...(req.body as any), reason: undefined },
  });
  if (!route.ok) {
    if (route.error === "Invalid project ID or post ID") {
      return res.status(400).json({ error: route.error });
    }
    return res.status(400).json({ error: "Invalid user ID" });
  }
  const parsedBody = parseUpdateDiscussionPostBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await updateDiscussionPost(
      parsedBody.value.userId,
      route.value.projectId,
      route.value.postId,
      parsedBody.value.title,
      parsedBody.value.body,
    );
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Post not found" });
    res.json(result.post);
  } catch (error) {
    console.error("Error updating discussion post:", error);
    res.status(500).json({ error: "Failed to update discussion post" });
  }
}

export async function deleteProjectDiscussionPostHandler(req: Request, res: Response) {
  const parsed = parseProjectUserPostQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const result = await deleteDiscussionPost(parsed.value.userId, parsed.value.projectId, parsed.value.postId);
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Post not found" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting discussion post:", error);
    res.status(500).json({ error: "Failed to delete discussion post" });
  }
}

export async function getForumSettingsHandler(req: Request, res: Response) {
  const parsed = parseProjectUserQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const settings = await fetchForumSettings(parsed.value.userId, parsed.value.projectId);
    if (!settings) return res.status(403).json({ error: "Forbidden" });
    res.json(settings);
  } catch (error) {
    console.error("Error fetching forum settings:", error);
    res.status(500).json({ error: "Failed to fetch forum settings" });
  }
}

export async function updateForumSettingsHandler(req: Request, res: Response) {
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });
  const parsedBody = parseForumSettingsBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const settings = await setForumSettings(parsedBody.value.userId, projectId.value, parsedBody.value.forumIsAnonymous);
    if (!settings) return res.status(403).json({ error: "Forbidden" });
    res.json(settings);
  } catch (error) {
    console.error("Error updating forum settings:", error);
    res.status(500).json({ error: "Failed to update forum settings" });
  }
}

export async function reportDiscussionPostHandler(req: Request, res: Response) {
  const parsed = parseProjectPostUserBody(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const result = await reportForumPost(parsed.value.userId, parsed.value.projectId, parsed.value.postId, parsed.value.reason);
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Post not found" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error reporting discussion post:", error);
    res.status(500).json({ error: "Failed to report discussion post" });
  }
}

export async function reactToDiscussionPostHandler(req: Request, res: Response) {
  const parsed = parseReactToDiscussionPostBody(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const result = await reactToDiscussionPost(parsed.value.userId, parsed.value.projectId, parsed.value.postId, parsed.value.type);
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Post not found" });
    res.json(result.post);
  } catch (error) {
    console.error("Error reacting to discussion post:", error);
    res.status(500).json({ error: "Failed to update reaction" });
  }
}

export async function createStudentForumReportHandler(req: Request, res: Response) {
  const parsed = parseProjectPostUserBody(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const result = await createStudentForumReport(parsed.value.userId, parsed.value.projectId, parsed.value.postId, parsed.value.reason);
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Post not found" });
    if (result.status === "already_reported")
      return res.status(409).json({ error: "Post already reported" });
    if (result.status === "duplicate")
      return res.status(409).json({ error: "You have already reported this post" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error reporting discussion post (student):", error);
    res.status(500).json({ error: "Failed to report post" });
  }
}

export async function getStudentForumReportsHandler(req: Request, res: Response) {
  const parsed = parseProjectUserQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const reports = await fetchStudentForumReports(parsed.value.userId, parsed.value.projectId);
    if (!reports) return res.status(403).json({ error: "Forbidden" });
    res.json(reports);
  } catch (error) {
    console.error("Error fetching student forum reports:", error);
    res.status(500).json({ error: "Failed to fetch student reports" });
  }
}

export async function approveStudentForumReportHandler(req: Request, res: Response) {
  const parsed = parseProjectReportUserBody(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const result = await approveStudentForumReport(parsed.value.userId, parsed.value.projectId, parsed.value.reportId);
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Report not found" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error approving student forum report:", error);
    res.status(500).json({ error: "Failed to approve student report" });
  }
}

export async function ignoreStudentForumReportHandler(req: Request, res: Response) {
  const parsed = parseProjectReportUserBody(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const result = await ignoreStudentForumReport(parsed.value.userId, parsed.value.projectId, parsed.value.reportId);
    if (result.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (result.status === "not_found") return res.status(404).json({ error: "Report not found" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error ignoring student forum report:", error);
    res.status(500).json({ error: "Failed to ignore student report" });
  }
}

export async function getStaffConversationHandler(req: Request, res: Response) {
  const parsed = parseProjectUserPostQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const conversation = await fetchStaffConversation(parsed.value.userId, parsed.value.projectId, parsed.value.postId);
    if (!conversation) return res.status(403).json({ error: "Forbidden" });
    res.json(conversation);
  } catch (error) {
    console.error("Error fetching staff forum conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
}

export async function getForumMembersHandler(req: Request, res: Response) {
  const parsed = parseProjectUserQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const members = await fetchForumMembers(parsed.value.userId, parsed.value.projectId);
    if (!members) return res.status(403).json({ error: "Forbidden" });
    res.json(members);
  } catch (error) {
    console.error("Error fetching forum members:", error);
    res.status(500).json({ error: "Failed to fetch forum members" });
  }
}
