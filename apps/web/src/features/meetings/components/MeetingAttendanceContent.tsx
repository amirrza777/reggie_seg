"use client";

import { useUser } from "@/features/auth/context";
import { isMeetingMember } from "../lib/meetingMember";
import { daysToMs } from "../lib/meetingTime";
import { useMeetingWithSettings } from "../hooks/useMeetingWithSettings";
import { MeetingBreadcrumbs } from "./MeetingBreadcrumbs";
import { AttendanceTable } from "./AttendanceTable";
import "../styles/meeting-detail.css";

type MeetingAttendanceContentProps = {
  meetingId: number;
  projectId: number;
};

export function MeetingAttendanceContent({ meetingId, projectId }: MeetingAttendanceContentProps) {
  const { user } = useUser();
  const { meeting, settings } = useMeetingWithSettings(meetingId);

  if (!meeting || !user || !settings) return null;

  const isOrganiser = meeting.organiserId === user.id;
  const isMember = isMeetingMember(meeting.team.allocations, user.id);
  const canRecord = isOrganiser || (settings.allowAnyoneToRecordAttendance && isMember);
  const attendanceEditWindowMs = daysToMs(settings.attendanceEditWindowDays);
  const isUpcomingMeeting = new Date(meeting.date) >= new Date();
  const meetingsHref = `/projects/${projectId}/meetings?tab=${isUpcomingMeeting ? "upcoming" : "previous"}`;
  const now = new Date();

  if (isUpcomingMeeting) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Attendance" />
        <p className="muted">Attendance can only be recorded during or after the meeting.</p>
      </div>
    );
  }

  if (now.getTime() - new Date(meeting.date).getTime() > attendanceEditWindowMs) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Attendance" />
        <p className="muted">The attendance recording window for this meeting has closed.</p>
      </div>
    );
  }

  if (!canRecord) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Attendance" />
        <p className="muted">You don't have permission to record attendance for this meeting.</p>
      </div>
    );
  }

  const members = meeting.participants.length > 0
    ? meeting.participants.map((p) => p.user)
    : meeting.team.allocations.map((a) => a.user);

  return (
    <div className="stack">
      <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Attendance" />
      <AttendanceTable
        meetingId={meeting.id}
        members={members}
        initialAttendances={meeting.attendances}
      />
    </div>
  );
}
