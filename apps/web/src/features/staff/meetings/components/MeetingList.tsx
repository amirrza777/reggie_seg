"use client";

import { useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import type { SortConfig } from "@/shared/ui/Table";
import { isPresent } from "../attendance";
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

export function MeetingList({ meetings }: MeetingListProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 1, direction: "desc" });

  const sorted = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      switch (sortConfig.column) {
        case 0: return dir * a.title.localeCompare(b.title);
        case 1: return dir * a.date.localeCompare(b.date);
        case 2: return dir * `${a.organiser.firstName} ${a.organiser.lastName}`.localeCompare(`${b.organiser.firstName} ${b.organiser.lastName}`);
        case 3: {
          const rateA = a.attendances.length > 0 ? a.attendances.filter((x) => isPresent(x.status)).length / a.attendances.length : 0;
          const rateB = b.attendances.length > 0 ? b.attendances.filter((x) => isPresent(x.status)).length / b.attendances.length : 0;
          return dir * (rateA - rateB);
        }
        case 4: return dir * ((a.minutes ? 1 : 0) - (b.minutes ? 1 : 0));
        default: return 0;
      }
    });
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
