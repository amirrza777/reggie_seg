"use client";

import { useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Table, type SortConfig } from "@/shared/ui/Table";
import type { MemberAttendance } from "../lib/attendance";

type AttendanceTableProps = {
  members: MemberAttendance[];
};

const STATUS_ORDER: Record<string, number> = { on_time: 0, late: 1, absent: 2 };
type MemberComparator = (a: MemberAttendance, b: MemberAttendance) => number;
const FALLBACK_STATUS_RANK = 3;

const memberComparators: MemberComparator[] = [
  (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  (a, b) => a.attended - b.attended,
  (a, b) => getAttendanceRatio(a) - getAttendanceRatio(b),
  (a, b) => getStatusRank(a.lastStatus) - getStatusRank(b.lastStatus),
];

function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "on_time": return "On time";
    case "late": return "Late";
    case "absent": return "Absent";
    default: return status;
  }
}

function getAttendanceRatio(member: MemberAttendance): number {
  return member.total > 0 ? member.attended / member.total : 0;
}

function getStatusRank(status: string | null): number {
  return STATUS_ORDER[status?.toLowerCase() ?? ""] ?? FALLBACK_STATUS_RANK;
}

function compareMembers(a: MemberAttendance, b: MemberAttendance, column: number, dir: number): number {
  const comparator = memberComparators[column];
  if (!comparator) {
    return 0;
  }
  return dir * comparator(a, b);
}

function getSortDirection(direction: SortConfig["direction"]) {
  return direction === "asc" ? 1 : -1;
}

function mapMemberRow(member: MemberAttendance) {
  const ratePercent = Math.round(getAttendanceRatio(member) * 100);
  const nameCell = (
    <span className="attendance-table__name">
      {member.firstName} {member.lastName}
      {member.atRisk && <span className="attendance-table__badge">At risk</span>}
    </span>
  );
  const statusCell = member.lastStatus ? (
    <span className={`attendance-table__status attendance-table__status--${member.lastStatus.toLowerCase()}`}>
      {formatStatus(member.lastStatus)}
    </span>
  ) : "—";
  return [nameCell, `${member.attended} / ${member.total}`, `${ratePercent}%`, statusCell];
}

function renderEmptyState() {
  return (
    <Card title="Attendance">
      <p className="muted">No attendance data recorded yet.</p>
    </Card>
  );
}

export function AttendanceTable({ members }: AttendanceTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 0, direction: "asc" });
  const sorted = useMemo(() => {
    const dir = getSortDirection(sortConfig.direction);
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
    return renderEmptyState();
  }

  const rows = sorted.map(mapMemberRow);
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
