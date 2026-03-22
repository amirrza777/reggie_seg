"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useUser } from "@/features/auth/context";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { getMeeting } from "../api/client";
import { AttendanceTable } from "./AttendanceTable";
import "../styles/meeting-detail.css";
import type { Meeting } from "../types";

type MeetingAttendanceContentProps = {
  meetingId: number;
  projectId: number;
};

export function MeetingAttendanceContent({ meetingId, projectId }: MeetingAttendanceContentProps) {
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

  if (new Date(meeting.date) >= new Date()) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">Attendance can only be recorded after the meeting has taken place.</p>
      </div>
    );
  }

  if (meeting.organiserId !== user.id) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">Only the meeting organiser can record attendance.</p>
      </div>
    );
  }

  const members = meeting.participants.length > 0
    ? meeting.participants.map((p) => p.user)
    : meeting.team.allocations.map((a) => a.user);

  return (
    <div className="stack">
      {backLink}
      <AttendanceTable
        meetingId={meeting.id}
        members={members}
        initialAttendances={meeting.attendances}
      />
    </div>
  );
}
