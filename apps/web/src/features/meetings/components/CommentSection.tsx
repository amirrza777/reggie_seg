"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useUser } from "@/features/auth/context";
import { addComment, deleteComment } from "../api/client";
import type { MeetingCommentRecord } from "../types";

type CommentSectionProps = {
  meetingId: number;
  initialComments: MeetingCommentRecord[];
};

export function CommentSection({ meetingId, initialComments }: CommentSectionProps) {
  const { user } = useUser();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleAddComment() {
    if (!newComment.trim() || !user) return;
    setStatus("loading");
    setMessage(null);
    try {
      await addComment(meetingId, user.id, newComment.trim());
      setComments((prev) => [
        ...prev,
        {
          id: Date.now(),
          meetingId,
          userId: user.id,
          content: newComment.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
        },
      ]);
      setNewComment("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setStatus("idle");
    }
  }

  async function handleDeleteComment(commentId: number) {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete comment");
    }
  }

  return (
    <Card title="Comments">
      <div className="stack">
        {comments.length === 0 && <p className="muted">No comments yet.</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="table__row">
            <div>
              <strong>{comment.user.firstName} {comment.user.lastName}</strong>
              <span className="muted"> — {new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <div>{comment.content}</div>
            {user && user.id === comment.userId && (
              <div>
                <Button type="button" variant="ghost" onClick={() => handleDeleteComment(comment.id)}>
                  Delete
                </Button>
              </div>
            )}
          </div>
        ))}
        {user && (
          <div className="stack">
            <label className="stack">
              <span>Add a comment</span>
              <textarea
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
              />
            </label>
            <div>
              <Button type="button" onClick={handleAddComment} disabled={status === "loading" || !newComment.trim()}>
                {status === "loading" ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        )}
        {message && <p className="error">{message}</p>}
      </div>
    </Card>
  );
}
