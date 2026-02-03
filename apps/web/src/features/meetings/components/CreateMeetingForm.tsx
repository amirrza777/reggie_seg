"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { createMeeting } from "../api/client";

type CreateMeetingFormProps = {
  teamId: number;
  onCreated: () => void;
};

export function CreateMeetingForm({ teamId, onCreated }: CreateMeetingFormProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [subject, setSubject] = useState("");
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    setStatus("loading");
    setMessage(null);

    try {
      await createMeeting({
        teamId,
        organiserId: 1, // TODO: replace with logged-in user ID
        title,
        date,
        subject: subject || undefined,
        location: location || undefined,
        agenda: agenda || undefined,
      });
      setStatus("success");
      setMessage("Meeting created!");
      setTitle("");
      setDate("");
      setSubject("");
      setLocation("");
      setAgenda("");
      onCreated();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to create meeting");
    }
  }

  return (
    <Card title="New Meeting">
      <form className="stack" onSubmit={handleSubmit}>
        <label className="stack" style={{ gap: 6 }}>
          <span>Title *</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="stack" style={{ gap: 6 }}>
          <span>Date *</span>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="stack" style={{ gap: 6 }}>
          <span>Subject</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="stack" style={{ gap: 6 }}>
          <span>Location</span>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="stack" style={{ gap: 6 }}>
          <span>Agenda</span>
          <textarea rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
        </label>
        <div>
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Creating..." : "Create Meeting"}
          </Button>
        </div>
        {message && <p className={status === "error" ? "error" : "muted"}>{message}</p>}
      </form>
    </Card>
  );
}
