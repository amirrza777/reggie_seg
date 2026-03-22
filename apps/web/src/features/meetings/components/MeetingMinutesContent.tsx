"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useUser } from "@/features/auth/context";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { getMeeting, getMeetingSettings } from "../api/client";
import { MeetingMinutes } from "./MeetingMinutes";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
import { Card } from "@/shared/ui/Card";
import "../styles/meeting-detail.css";
import type { Meeting } from "../types";

type MeetingMinutesContentProps = {
  meetingId: number;
  projectId: number;
};

export function MeetingMinutesContent({ meetingId, projectId }: MeetingMinutesContentProps) {
  const { user } = useUser();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [editWindowMs, setEditWindowMs] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getMeeting(meetingId), getMeetingSettings(meetingId)]).then(([m, settings]) => {
      setMeeting(m);
      setEditWindowMs(settings.minutesEditWindowDays * 24 * 60 * 60 * 1000);
    });
  }, [meetingId]);

  if (!meeting || !user || editWindowMs === null) return null;

  const backLink = (
    <AnchorLink href={`/projects/${projectId}/meetings/${meetingId}`} className="back-link">
      <ChevronLeft size={14} />
      Back to meeting
    </AnchorLink>
  );

  const meetingDate = new Date(meeting.date);
  const now = new Date();

  if (meetingDate > now) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">Minutes cannot be written until the meeting has started.</p>
      </div>
    );
  }

  if (now.getTime() - meetingDate.getTime() > editWindowMs) {
    return (
      <div className="stack">
        {backLink}
        <Card title="Minutes">
          <p className="muted">The edit window for these minutes has closed.</p>
          {meeting.minutes && <RichTextViewer content={meeting.minutes.content} />}
        </Card>
      </div>
    );
  }

  if (meeting.minutes && meeting.minutes.writerId !== user.id) {
    return (
      <div className="stack">
        {backLink}
        <Card title="Minutes">
          <p className="muted">Written by {meeting.minutes.writer.firstName} {meeting.minutes.writer.lastName}</p>
          <RichTextViewer content={meeting.minutes.content} />
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      {backLink}
      <Card title="Minutes">
        <MeetingMinutes
          meetingId={meeting.id}
          writerId={user.id}
          initialContent={meeting.minutes?.content ?? ""}
        />
      </Card>
    </div>
  );
}
