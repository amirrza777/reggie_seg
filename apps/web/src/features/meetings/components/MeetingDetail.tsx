"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { useUser } from "@/features/auth/context";
import { AttendanceTable } from "./AttendanceTable";
import { MeetingMinutes } from "./MeetingMinutes";
import { CommentSection } from "./CommentSection";
import { saveMinutes } from "../api/client";
import type { Meeting } from "../types";

type MeetingDetailProps = {
  meeting: Meeting;
};

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  const { user } = useUser();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSaveMinutes(content: string) {
    setStatus("loading");
    setMessage(null);
    try {
      await saveMinutes(meeting.id, user!.id, content);
      setStatus("success");
      setMessage("Minutes saved!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to save minutes");
    }
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

      <AttendanceTable meetingId={meeting.id} initialAttendances={meeting.attendances} />

      <Card title="Minutes">
        <MeetingMinutes
          initialContent={meeting.minutes?.content ?? ""}
          onSave={handleSaveMinutes}
        />
        {message && <p className={status === "error" ? "error" : "muted"}>{message}</p>}
      </Card>

      <CommentSection meetingId={meeting.id} initialComments={meeting.comments} />
    </div>
  );
}
