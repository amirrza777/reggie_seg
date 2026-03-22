"use client";

import { useMemo, useState } from "react";
import { Eye, Video, Pencil, UserCheck, NotebookPen } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import type { SortConfig } from "@/shared/ui/Table";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { AddToCalendarDropdown } from "./AddToCalendarDropdown";
import { formatDate } from "@/shared/lib/formatDate";
import { useUser } from "@/features/auth/context";
import "../styles/meeting-list.css";
import type { Meeting } from "../types";

type MeetingListProps = {
  meetings: Meeting[];
  projectId: number;
  title?: string;
  emptyMessage?: string;
  showMinutesWriter?: boolean;
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
}: MeetingListProps) {
  const { user } = useUser();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 1,
    direction: showMinutesWriter ? "desc" : "asc",
  });

  const sorted = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      switch (sortConfig.column) {
        case 0:
          return dir * a.title.localeCompare(b.title);
        case 1:
          return dir * a.date.localeCompare(b.date);
        case 2:
          return (
            dir *
            `${a.organiser.firstName} ${a.organiser.lastName}`.localeCompare(
              `${b.organiser.firstName} ${b.organiser.lastName}`
            )
          );
        case 3: {
          if (showMinutesWriter) {
            const nameA = a.minutes
              ? `${a.minutes.writer.firstName} ${a.minutes.writer.lastName}`
              : "";
            const nameB = b.minutes
              ? `${b.minutes.writer.firstName} ${b.minutes.writer.lastName}`
              : "";
            return dir * nameA.localeCompare(nameB);
          }
          return dir * (a.location ?? "").localeCompare(b.location ?? "");
        }
        case 4: {
          if (!showMinutesWriter) {
            return dir * (a.participants.length - b.participants.length);
          }
          return 0;
        }
        default:
          return 0;
      }
    });
  }, [meetings, sortConfig, showMinutesWriter]);

  function handleSort(columnIndex: number) {
    if (columnIndex === 5) return;
    if (showMinutesWriter && columnIndex === 4) return;
    setSortConfig((prev) =>
      prev.column === columnIndex
        ? { column: columnIndex, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column: columnIndex, direction: "asc" }
    );
  }

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
    const isOrganiser = user?.id === meeting.organiser.id;
    const writer = meeting.minutes?.writer;

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
        {isOrganiser && upcoming && (
          <AnchorLink
            href={`/projects/${projectId}/meetings/${meeting.id}/edit`}
            className="meeting-list__action"
            aria-label="Edit meeting"
            title="Edit meeting"
          >
            <Pencil size={16} />
          </AnchorLink>
        )}
        {isOrganiser && !upcoming && (
          <AnchorLink
            href={`/projects/${projectId}/meetings/${meeting.id}/attendance`}
            className="meeting-list__action"
            aria-label="Record attendance"
            title="Record attendance"
          >
            <UserCheck size={16} />
          </AnchorLink>
        )}
        {!upcoming && (
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

    const teamSize = meeting.team.allocations.length;
    const invitedCount = meeting.participants.length;

    const attendedCount = meeting.attendances.filter((a) => a.status !== "absent").length;
    const recordedCount = meeting.attendances.length;
    const attendanceCell = recordedCount > 0
      ? `${attendedCount} of ${recordedCount}`
      : <span className="muted">—</span>;

    return [
      meeting.title,
      formatDate(meeting.date),
      `${meeting.organiser.firstName} ${meeting.organiser.lastName}`,
      showMinutesWriter
        ? writer
          ? `${writer.firstName} ${writer.lastName}`
          : <span className="muted">—</span>
        : meeting.location ?? "",
      showMinutesWriter
        ? attendanceCell
        : `${invitedCount} of ${teamSize}`,
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
