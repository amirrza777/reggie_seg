"use client";

import { ChevronLeft, Pencil, UserCheck, NotebookPen } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { useUser } from "@/features/auth/useUser";
import { CommentSection } from "./CommentSection";
import { AddToCalendarDropdown } from "./AddToCalendarDropdown";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
import { isMeetingMember } from "../lib/meetingMember";
import { isWithinEditWindow } from "../lib/meetingTime";
import "../styles/meeting-detail.css";
import "../styles/meeting-list.css";
import type { Meeting, MeetingPermissions } from "../types";

type MeetingDetailProps = {
  meeting: Meeting;
  projectId: number;
  permissions: MeetingPermissions;
};

function formatStatus(status: string) {
  const labels: Record<string, string> = { on_time: "On time", late: "Late", absent: "Absent" };
  return labels[status] ?? status;
}

export function MeetingDetail({ meeting, projectId, permissions }: MeetingDetailProps) {
  const { user } = useUser();
  const members = meeting.team?.allocations?.map((a) => a.user) ?? [];
  const upcoming = new Date(meeting.date) >= new Date();
  const isOrganiser = user?.id === meeting.organiserId;
  const isMember = user ? isMeetingMember(meeting.team?.allocations ?? [], user.id) : false;
  const canEdit = isOrganiser || (permissions.allowAnyoneToEditMeetings && isMember);
  const canRecordAttendance = isOrganiser || (permissions.allowAnyoneToRecordAttendance && isMember);
  const canWriteMinutes = !meeting.minutes || meeting.minutes.writerId === user?.id || (permissions.allowAnyoneToWriteMinutes && isMember);
  const minutesWindowOpen = isWithinEditWindow(meeting.date, permissions.minutesEditWindowDays);
  const attendanceWindowOpen = isWithinEditWindow(meeting.date, permissions.attendanceEditWindowDays);

  const cardAction = (
    <div className="meeting-list__actions">
      {upcoming && <AddToCalendarDropdown meeting={meeting} compact />}
      {canEdit && upcoming && (
        <AnchorLink
          href={`/projects/${projectId}/meetings/${meeting.id}/edit`}
          className="meeting-list__action"
          aria-label="Edit meeting"
          title="Edit meeting"
        >
          <Pencil size={16} />
        </AnchorLink>
      )}
      {canRecordAttendance && !upcoming && attendanceWindowOpen && (
        <AnchorLink
          href={`/projects/${projectId}/meetings/${meeting.id}/attendance`}
          className="meeting-list__action"
          aria-label="Record attendance"
          title="Record attendance"
        >
          <UserCheck size={16} />
        </AnchorLink>
      )}
      {!upcoming && canWriteMinutes && minutesWindowOpen && (
        <AnchorLink
          href={`/projects/${projectId}/meetings/${meeting.id}/minutes`}
          className="meeting-list__action"
          aria-label="Meeting minutes"
          title="Meeting minutes"
        >
          <NotebookPen size={16} />
        </AnchorLink>
      )}
    </div>
  );

  return (
    <div className="stack">
      <AnchorLink href={`/projects/${projectId}/meetings?tab=${upcoming ? "upcoming" : "previous"}`} className="back-link">
        <ChevronLeft size={14} />
        {upcoming ? "Back to upcoming meetings" : "Back to previous meetings"}
      </AnchorLink>

      <Card title={meeting.title} action={cardAction}>
        <p>Date: {new Date(meeting.date).toLocaleString()}</p>
        <p>Organiser: {meeting.organiser.firstName} {meeting.organiser.lastName}</p>
        {meeting.subject && <p>Subject: {meeting.subject}</p>}
        {meeting.location && <p>Location: {meeting.location}</p>}
        {meeting.videoCallLink && (
          <p>
            Video call:{" "}
            <a href={meeting.videoCallLink} target="_blank" rel="noopener noreferrer">
              {meeting.videoCallLink}
            </a>
          </p>
        )}
        {meeting.agenda && (
          <div>
            <h3>Agenda</h3>
            <RichTextViewer content={meeting.agenda} />
          </div>
        )}
      </Card>

      {meeting.participants.length > 0 && meeting.attendances.length === 0 && (
        <Card title="Participants">
          <Table
            headers={["Name"]}
            rows={meeting.participants.map((p) => [
              `${p.user.firstName} ${p.user.lastName}`,
            ])}
          />
        </Card>
      )}

      {meeting.attendances.length > 0 && (
        <Card title="Attendance">
          <Table
            headers={["Name", "Status"]}
            rows={meeting.attendances.map((a) => [
              `${a.user.firstName} ${a.user.lastName}`,
              formatStatus(a.status),
            ])}
            className="table table--attendance"
          />
        </Card>
      )}

      {meeting.minutes && (
        <Card title="Minutes">
          <RichTextViewer content={meeting.minutes.content} />
        </Card>
      )}

      <CommentSection
        meetingId={meeting.id}
        teamId={meeting.teamId}
        members={members}
        initialComments={meeting.comments ?? []}
      />
    </div>
  );
}
