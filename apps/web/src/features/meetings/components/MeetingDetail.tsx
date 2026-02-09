"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useUser } from "@/features/auth/context";
import { AttendanceTable } from "./AttendanceTable";
import { MinutesEditor } from "./MinutesEditor";
import { markAttendance, saveMinutes, addComment, deleteComment } from "../api/client";
import type { Meeting, MeetingAttendanceRecord } from "../types";

type MeetingDetailProps = {
  meeting: Meeting;
  onUpdated?: () => void;
};

export function MeetingDetail({ meeting, onUpdated }: MeetingDetailProps) {
  const { user } = useUser();
  const [attendances, setAttendances] = useState<MeetingAttendanceRecord[]>(meeting.attendances);
  const [comments, setComments] = useState(meeting.comments);
  const [newComment, setNewComment] = useState("");
  const [commentStatus, setCommentStatus] = useState<"idle" | "loading">("idle");

  function handleStatusChange(userId: number, status: string) {
    setAttendances((prev) =>
      prev.map((a) => (a.userId === userId ? { ...a, status } : a))
    );
  }

  async function handleSaveAttendance() {
    await markAttendance(
      meeting.id,
      attendances.map((a) => ({ userId: a.userId, status: a.status }))
    );
  }

  async function handleSaveMinutes(content: string) {
    await saveMinutes(meeting.id, user!.id, content);
  }

  async function handleAddComment() {
    if (!newComment.trim() || !user) return;
    setCommentStatus("loading");
    try {
      await addComment(meeting.id, user.id, newComment.trim());
      setComments((prev) => [
        ...prev,
        {
          id: Date.now(),
          meetingId: meeting.id,
          userId: user.id,
          content: newComment.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
        },
      ]);
      setNewComment("");
    } finally {
      setCommentStatus("idle");
    }
  }

  async function handleDeleteComment(commentId: number) {
    await deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="stack">
      <Card title={meeting.title}>
        <p>Date: {new Date(meeting.date).toLocaleString()}</p>
        <p>Organiser: {meeting.organiser.firstName} {meeting.organiser.lastName}</p>
        {meeting.location && <p>Location: {meeting.location}</p>}
        {meeting.agenda && (
          <div>
            <h3>Agenda</h3>
            <p>{meeting.agenda}</p>
          </div>
        )}
      </Card>

      <Card title="Attendance">
        <AttendanceTable
          attendances={attendances}
          onStatusChange={handleStatusChange}
          onSave={handleSaveAttendance}
        />
      </Card>

      <Card title="Minutes">
        <MinutesEditor
          initialContent={meeting.minutes?.content ?? ""}
          onSave={handleSaveMinutes}
        />
      </Card>

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
                <Button type="button" onClick={handleAddComment} disabled={commentStatus === "loading" || !newComment.trim()}>
                  {commentStatus === "loading" ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
