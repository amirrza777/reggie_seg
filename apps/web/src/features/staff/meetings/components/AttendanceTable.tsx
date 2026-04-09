"use client";

import { useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Table, type SortConfig } from "@/shared/ui/Table";
import type { MemberAttendance } from "../lib/attendance";

type AttendanceTableProps = {
  members: MemberAttendance[];
};

const STATUS_ORDER: Record<string, number> = { on_time: 0, late: 1, absent: 2 };

function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "on_time": return "On time";
    case "late": return "Late";
    case "absent": return "Absent";
    default: return status;
  }
}

function compareMembers(a: MemberAttendance, b: MemberAttendance, column: number, dir: number): number {
  switch (column) {
    case 0: return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    case 1: return dir * (a.attended - b.attended);
    case 2: {
      const rateA = a.total > 0 ? a.attended / a.total : 0;
      const rateB = b.total > 0 ? b.attended / b.total : 0;
      return dir * (rateA - rateB);
    }
    case 3: {
      const rankA = STATUS_ORDER[a.lastStatus?.toLowerCase() ?? ""] ?? 3;
      const rankB = STATUS_ORDER[b.lastStatus?.toLowerCase() ?? ""] ?? 3;
      return dir * (rankA - rankB);
    }
    default: return 0;
  }
}

export function AttendanceTable({ members }: AttendanceTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 0, direction: "asc" });

  const sorted = useMemo(() => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    return [...members].sort((a, b) => compareMembers(a, b, sortConfig.column, dir));
  }, [members, sortConfig]);

  function handleSort(columnIndex: number) {
    setSortConfig((prev) =>
      prev.column === columnIndex
        ? { column: columnIndex, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column: columnIndex, direction: "asc" }
    );
  }

  if (members.length === 0) {
    return (
      <Card title="Attendance">
        <p className="muted">No attendance data recorded yet.</p>
      </Card>
    );
  }

  const rows = sorted.map((m) => {
    const rate = m.total > 0 ? Math.round((m.attended / m.total) * 100) : 0;
    const nameCell = (
      <span className="attendance-table__name">
        {m.firstName} {m.lastName}
        {m.atRisk && (
          <span className="attendance-table__badge">At risk</span>
        )}
      </span>
    );
    const statusCell = m.lastStatus ? (
      <span className={`attendance-table__status attendance-table__status--${m.lastStatus.toLowerCase()}`}>
        {formatStatus(m.lastStatus)}
      </span>
    ) : "—";
    return [nameCell, `${m.attended} / ${m.total}`, `${rate}%`, statusCell];
  });

  return (
    <Card title="Attendance">
      <Table
        headers={["Member", "Attended", "Rate", "Last status"]}
        rows={rows}
        className="attendance-table"
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    </Card>
  );
}
