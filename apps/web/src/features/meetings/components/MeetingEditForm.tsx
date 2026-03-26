"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { updateMeeting, deleteMeeting } from "../api/client";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import "../styles/meeting-list.css";
import type { Meeting } from "../types";

type MeetingEditFormProps = {
  meeting: Meeting;
  userId: number;
  projectId: number;
};

export function MeetingEditForm({ meeting, userId, projectId }: MeetingEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(meeting.title);
  const [date, setDate] = useState(meeting.date.slice(0, 16));
  const [subject, setSubject] = useState(meeting.subject ?? "");
  const [location, setLocation] = useState(meeting.location ?? "");
  const [videoCallLink, setVideoCallLink] = useState(meeting.videoCallLink ?? "");
  const [agenda, setAgenda] = useState(meeting.agenda ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const members = meeting.team.allocations.map((a) => a.user);
  const [inviteAll, setInviteAll] = useState(
    meeting.participants.length === members.length
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(meeting.participants.map((p) => p.userId))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    setStatus("loading");
    setError(null);

    try {
      await updateMeeting(meeting.id, userId, {
        title,
        date,
        subject: subject || undefined,
        location: location || undefined,
        videoCallLink: videoCallLink || undefined,
        agenda: agenda || undefined,
        participantIds: inviteAll ? members.map((m) => m.id) : Array.from(selectedIds),
      });
      router.push(`/projects/${projectId}/meetings/${meeting.id}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  }

  function toggleParticipant(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleDelete() {
    setStatus("loading");
    await deleteMeeting(meeting.id);
    router.push(`/projects/${projectId}/meetings`);
  }

  return (
    <Card title="Edit Meeting">
      <form className="stack" onSubmit={handleSubmit}>
        <label className="stack">
          <span>Title *</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="stack">
          <span>Date *</span>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="stack">
          <span>Subject</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="stack">
          <span>Location</span>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="stack">
          <span>Video call link</span>
          <input type="url" value={videoCallLink} onChange={(e) => setVideoCallLink(e.target.value)} placeholder="https://meet.google.com/..." />
        </label>
        <div className="stack">
          <span>Agenda</span>
          <RichTextEditor initialContent={agenda} onChange={setAgenda} placeholder="Outline the meeting agenda..." />
        </div>
        {members.length > 0 && (
          <div className="stack">
            <span>Participants</span>
            <label className="meeting-form__participant-item">
              <input
                type="checkbox"
                checked={inviteAll}
                onChange={(e) => setInviteAll(e.target.checked)}
              />
              All team members
            </label>
            {!inviteAll && (
              <div className="meeting-form__participant-list">
                {members.map((member) => (
                  <label key={member.id} className="meeting-form__participant-item">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.id)}
                      onChange={() => toggleParticipant(member.id)}
                    />
                    {member.firstName} {member.lastName}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div className="ui-row ui-row--between">
          {confirmDelete ? (
            <div className="ui-row">
              <span className="muted">This cannot be undone.</span>
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
              <Button type="button" variant="danger" disabled={status === "loading"} onClick={handleDelete}>
                Yes, delete
              </Button>
            </div>
          ) : (
            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete meeting
            </Button>
          )}
          <div className="ui-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/projects/${projectId}/meetings/${meeting.id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={status === "loading" || !title || !date}>
              {status === "loading" ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
