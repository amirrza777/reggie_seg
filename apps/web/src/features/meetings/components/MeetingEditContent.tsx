"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useUser } from "@/features/auth/context";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { getMeeting } from "../api/client";
import { MeetingEditForm } from "./MeetingEditForm";
import "../styles/meeting-detail.css";
import type { Meeting } from "../types";

type MeetingEditContentProps = {
  meetingId: number;
  projectId: number;
};

export function MeetingEditContent({ meetingId, projectId }: MeetingEditContentProps) {
  const { user } = useUser();
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    getMeeting(meetingId).then(setMeeting);
  }, [meetingId]);

  if (!meeting || !user) return null;

  const backLink = (
    <AnchorLink href={`/projects/${projectId}/meetings/${meetingId}`} className="back-link">
      <ChevronLeft size={14} />
      Back to meeting
    </AnchorLink>
  );

  if (meeting.organiserId !== user.id) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">Only the meeting organiser can edit meeting details.</p>
      </div>
    );
  }

  if (new Date(meeting.date) < new Date()) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">Meeting details cannot be edited once the meeting has started.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {backLink}
      <MeetingEditForm meeting={meeting} userId={user.id} projectId={projectId} />
    </div>
  );
}
