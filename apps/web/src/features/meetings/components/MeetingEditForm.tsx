"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { updateMeeting } from "../api/client";
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
      });
      router.push(`/projects/${projectId}/meetings/${meeting.id}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
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
        <label className="stack">
          <span>Agenda</span>
          <textarea rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
        </label>
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
        {error && <p className="error">{error}</p>}
      </form>
    </Card>
  );
}
