"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useUser } from "@/features/auth/context";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { getMeeting, getMeetingSettings } from "../api/client";
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
  const [allowAnyoneToRecord, setAllowAnyoneToRecord] = useState(false);
  const [attendanceEditWindowMs, setAttendanceEditWindowMs] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getMeeting(meetingId), getMeetingSettings(meetingId)]).then(([m, s]) => {
      setMeeting(m);
      setAllowAnyoneToRecord(s.allowAnyoneToRecordAttendance);
      setAttendanceEditWindowMs(s.attendanceEditWindowDays * 24 * 60 * 60 * 1000);
    });
  }, [meetingId]);

  if (!meeting || !user || attendanceEditWindowMs === null) return null;

  const isOrganiser = meeting.organiserId === user.id;
  const isMember = meeting.team.allocations.some((a) => a.user.id === user.id);
  const canRecord = isOrganiser || (allowAnyoneToRecord && isMember);

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
        <p className="muted">Attendance can only be recorded during or after the meeting.</p>
      </div>
    );
  }

  if (Date.now() - new Date(meeting.date).getTime() > attendanceEditWindowMs) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">The attendance recording window for this meeting has closed.</p>
      </div>
    );
  }

  if (!canRecord) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">You don't have permission to record attendance for this meeting.</p>
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
