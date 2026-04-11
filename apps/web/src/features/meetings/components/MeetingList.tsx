"use client";

import { Eye, Video, Pencil, UserCheck, NotebookPen } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { AddToCalendarDropdown } from "./AddToCalendarDropdown";
import { formatDate } from "@/shared/lib/formatDate";
import { useUser } from "@/features/auth/context";
import { getMeetingPermissions } from "../lib/meetingPermissions";
import { useMeetingSort } from "../hooks/useMeetingSort";
import "../styles/meeting-list.css";
import type { Meeting, MeetingPermissions } from "../types";

type MeetingListProps = {
  meetings: Meeting[];
  projectId: number;
  title?: string;
  emptyMessage?: string;
  showMinutesWriter?: boolean;
  permissions?: MeetingPermissions | null;
  workspaceReadOnly?: boolean;
};

function isUpcoming(meeting: Meeting) {
  return new Date(meeting.date) >= new Date();
}

export function MeetingList({
  meetings,
  projectId,
  title = "Meetings",
  emptyMessage,
  showMinutesWriter = false,
  permissions = null,
  workspaceReadOnly = false,
}: MeetingListProps) {
  const { user } = useUser();
  const { sorted, sortConfig, handleSort } = useMeetingSort(
    meetings,
    showMinutesWriter,
  );

  if (meetings.length === 0) {
    return (
      <Card title={title}>
        <p className="muted">{emptyMessage ?? "No meetings to show."}</p>
      </Card>
    );
  }

  const headers = [
    "Title",
    "Date",
    "Organiser",
    showMinutesWriter ? "Minutes by" : "Location",
    showMinutesWriter ? "Attendance" : "Invited",
    "",
  ];

  const rows = sorted.map((meeting) => {
    const upcoming = isUpcoming(meeting);
    const flags = getMeetingPermissions(
      meeting,
      permissions,
      user?.id ?? null,
      !workspaceReadOnly,
    );
    const writer = meeting.minutes?.writer;

    const teamSize = meeting.team?.allocations?.length ?? 0;
    const invitedCount = meeting.participants?.length ?? 0;
    const attendances = meeting.attendances ?? [];
    const attendedCount = attendances.filter(
      (a) => a.status !== "absent",
    ).length;
    const recordedCount = attendances.length;
    const attendanceCell =
      recordedCount > 0 ? (
        `${attendedCount} of ${recordedCount}`
      ) : (
        <span className="muted">—</span>
      );

    const actions = (
      <div className="meeting-list__actions">
        <AnchorLink
          href={`/projects/${projectId}/meetings/${meeting.id}`}
          className="meeting-list__action"
          aria-label="View meeting"
          title="View meeting"
        >
          <Eye size={16} />
        </AnchorLink>
        {flags.canEditMeeting && upcoming && (
          <AnchorLink
            href={`/projects/${projectId}/meetings/${meeting.id}/edit`}
            className="meeting-list__action"
            aria-label="Edit meeting"
            title="Edit meeting"
          >
            <Pencil size={16} />
          </AnchorLink>
        )}
        {flags.canRecordAttendance &&
          !upcoming &&
          flags.attendanceWindowOpen && (
            <AnchorLink
              href={`/projects/${projectId}/meetings/${meeting.id}/attendance`}
              className="meeting-list__action"
              aria-label="Record attendance"
              title="Record attendance"
            >
              <UserCheck size={16} />
            </AnchorLink>
          )}
        {!upcoming && flags.canWriteMinutes && flags.minutesWindowOpen && (
          <AnchorLink
            href={`/projects/${projectId}/meetings/${meeting.id}/minutes`}
            className="meeting-list__action"
            aria-label="Meeting minutes"
            title="Meeting minutes"
          >
            <NotebookPen size={16} />
          </AnchorLink>
        )}
        {meeting.videoCallLink && upcoming && (
          <a
            href={meeting.videoCallLink}
            target="_blank"
            rel="noopener noreferrer"
            className="meeting-list__action meeting-list__action--join"
            aria-label="Join video call"
            title="Join video call"
          >
            <Video size={16} />
          </a>
        )}
        {upcoming && <AddToCalendarDropdown meeting={meeting} compact />}
      </div>
    );

    return [
      meeting.title,
      formatDate(meeting.date),
      `${meeting.organiser.firstName} ${meeting.organiser.lastName}`,
      showMinutesWriter ? (
        writer ? (
          `${writer.firstName} ${writer.lastName}`
        ) : (
          <span className="muted">—</span>
        )
      ) : (
        (meeting.location ?? "")
      ),
      showMinutesWriter ? attendanceCell : `${invitedCount} of ${teamSize}`,
      actions,
    ];
  });

  return (
    <Card title={title}>
      <Table
        headers={headers}
        rows={rows}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    </Card>
  );
}
