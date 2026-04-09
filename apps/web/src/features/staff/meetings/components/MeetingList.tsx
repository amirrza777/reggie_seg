"use client";

import { useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Table, type SortConfig } from "@/shared/ui/Table";
import { isPresent, getAttendanceRate } from "../lib/attendance";
import type { StaffMeeting } from "../types";

type MeetingListProps = {
  meetings: StaffMeeting[];
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function compareMeetings(a: StaffMeeting, b: StaffMeeting, column: number, dir: number): number {
  switch (column) {
    case 0: return dir * a.title.localeCompare(b.title);
    case 1: return dir * a.date.localeCompare(b.date);
    case 2: return dir * `${a.organiser.firstName} ${a.organiser.lastName}`.localeCompare(`${b.organiser.firstName} ${b.organiser.lastName}`);
    case 3: return dir * (getAttendanceRate(a.attendances) - getAttendanceRate(b.attendances));
    case 4: return dir * ((a.minutes ? 1 : 0) - (b.minutes ? 1 : 0));
    default: return 0;
  }
}

export function MeetingList({ meetings }: MeetingListProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 1, direction: "desc" });

  const sorted = useMemo(() => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
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
    return (
      <Card title="Meetings">
        <p className="muted">No meetings recorded yet.</p>
      </Card>
    );
  }

  const rows = sorted.map((meeting) => {
    const present = meeting.attendances.filter((a) => isPresent(a.status)).length;
    const total = meeting.attendances.length;
    return [
      meeting.title,
      formatDate(meeting.date),
      `${meeting.organiser.firstName} ${meeting.organiser.lastName}`,
      total > 0 ? `${present} / ${total}` : <span className="muted">Not recorded</span>,
      meeting.minutes ? `${meeting.minutes.writer.firstName} ${meeting.minutes.writer.lastName}` : <span className="muted">No</span>,
    ];
  });

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
