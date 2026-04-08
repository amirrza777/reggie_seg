"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useUser } from "@/features/auth/useUser";
import { addComment, deleteComment } from "../api/client";
import { CommentInput } from "./CommentInput";
import type { MeetingCommentRecord } from "../types";

type Member = {
  id: number;
  firstName: string;
  lastName: string;
};

type CommentSectionProps = {
  meetingId: number;
  teamId?: number;
  members?: Member[];
  initialComments?: MeetingCommentRecord[];
  allowComposer?: boolean;
};

function renderCommentContent(content: string) {
  const parts = content.split(/(@\p{L}+(?:\s+\p{L}+)?)/gu);
  return parts.map((part, i) =>
    part.startsWith("@") ? <span key={i} className="mention-node">{part}</span> : part
  );
}

export function CommentSection({
  meetingId,
  teamId,
  members = [],
  initialComments = [],
  allowComposer = true,
}: CommentSectionProps) {
  const { user } = useUser();
  const [comments, setComments] = useState(initialComments);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePost(text: string) {
    if (!user) return;
    setMessage(null);
    try {
      if (typeof teamId === "number") {
        await addComment(meetingId, user.id, text, teamId);
      } else {
        await addComment(meetingId, user.id, text);
      }
      setComments((prev) => [
        ...prev,
        {
          id: Date.now(),
          meetingId,
          userId: user.id,
          content: text,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
        },
      ]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to post comment");
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
          <div key={comment.id} className="comment">
            <div className="comment__header">
              <div className="comment__meta">
                <strong>{comment.user.firstName} {comment.user.lastName}</strong>
                <span className="muted"> — {new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              {allowComposer && user && user.id === comment.userId && (
                <Button type="button" variant="ghost" onClick={() => handleDeleteComment(comment.id)}>
                  Delete
                </Button>
              )}
            </div>
            <div className="comment__body">{renderCommentContent(comment.content)}</div>
          </div>
        ))}
        {allowComposer && user ? <CommentInput members={members} onPost={handlePost} /> : null}
        {message && <p className="error">{message}</p>}
      </div>
    </Card>
  );
}
