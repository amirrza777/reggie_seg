import type { Request, Response } from "express";
import { sendProjectOrModuleArchivedConflict } from "../../shared/projectWriteGuard.js";
import { addComment, removeComment } from "./service.js";

/** Handles requests for add comment. */
export async function addCommentHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);
  const { userId, content, teamId } = req.body;

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  if (!userId || !content) {
    return res.status(400).json({ error: "Missing required fields: userId, content" });
  }

  try {
    const comment = await addComment(meetingId, userId, content, teamId);
    res.status(201).json(comment);
  } catch (error) {
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    if ((error as { code?: string })?.code === "NOT_FOUND") {
      return res.status(404).json({ error: "Meeting not found" });
    }
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for delete comment. */
export async function deleteCommentHandler(req: Request, res: Response) {
  const commentId = Number(req.params.commentId);

  if (isNaN(commentId)) {
    return res.status(400).json({ error: "Invalid comment ID" });
  }

  try {
    await removeComment(commentId);
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
