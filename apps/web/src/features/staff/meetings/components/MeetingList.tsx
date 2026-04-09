"use client";

import { useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Table, type SortConfig } from "@/shared/ui/Table";
import { isPresent, getAttendanceRate } from "../lib/attendance";
import type { StaffMeeting } from "../types";

type MeetingListProps = {
  meetings: StaffMeeting[];
};
type MeetingComparator = (a: StaffMeeting, b: StaffMeeting) => number;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const meetingComparators: MeetingComparator[] = [
  (a, b) => a.title.localeCompare(b.title),
  (a, b) => a.date.localeCompare(b.date),
  (a, b) => `${a.organiser.firstName} ${a.organiser.lastName}`.localeCompare(`${b.organiser.firstName} ${b.organiser.lastName}`),
  (a, b) => getAttendanceRate(a.attendances) - getAttendanceRate(b.attendances),
  (a, b) => (a.minutes ? 1 : 0) - (b.minutes ? 1 : 0),
];

function compareMeetings(a: StaffMeeting, b: StaffMeeting, column: number, dir: number): number {
  const comparator = meetingComparators[column];
  if (!comparator) {
    return 0;
  }
  return dir * comparator(a, b);
}

function getSortDirection(direction: SortConfig["direction"]) {
  return direction === "asc" ? 1 : -1;
}

function renderEmptyState() {
  return (
    <Card title="Meetings">
      <p className="muted">No meetings recorded yet.</p>
    </Card>
  );
}

function mapMeetingRow(meeting: StaffMeeting) {
  const present = meeting.attendances.filter((attendance) => isPresent(attendance.status)).length;
  const total = meeting.attendances.length;
  return [
    meeting.title,
    formatDate(meeting.date),
    `${meeting.organiser.firstName} ${meeting.organiser.lastName}`,
    total > 0 ? `${present} / ${total}` : <span className="muted">Not recorded</span>,
    meeting.minutes ? `${meeting.minutes.writer.firstName} ${meeting.minutes.writer.lastName}` : <span className="muted">No</span>,
  ];
}

export function MeetingList({ meetings }: MeetingListProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 1, direction: "desc" });
  const sorted = useMemo(() => {
    const dir = getSortDirection(sortConfig.direction);
    return [...meetings].sort((a, b) => compareMeetings(a, b, sortConfig.column, dir));
  }, [meetings, sortConfig]);

  function handleSort(columnIndex: number) {
    setSortConfig((prev) =>
      prev.column === columnIndex
        ? { column: columnIndex, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column: columnIndex, direction: "asc" }
    );
  }

  if (meetings.length === 0) {
    return renderEmptyState();
  }

  const rows = sorted.map(mapMeetingRow);
  return (
    <Card title="Meetings">
      <Table
        headers={["Title", "Date", "Organiser", "Attendance", "Minutes"]}
        rows={rows}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    </Card>
  );
}
