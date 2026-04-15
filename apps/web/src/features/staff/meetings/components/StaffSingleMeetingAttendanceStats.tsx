import type { MeetingAttendanceRecord } from "@/features/meetings/types";
import { Table } from "@/shared/ui/Table";
import { isPresent } from "../lib/attendance";

function formatAttendanceStatus(status: string) {
  const key = status.toLowerCase();
  if (key === "on_time") return "On time";
  if (key === "late") return "Late";
  if (key === "absent") return "Absent";
  return status;
}

function attendanceStatusCell(status: string) {
  const key = status.toLowerCase();
  const mod =
    key === "on_time" ? "on_time" : key === "late" ? "late" : key === "absent" ? "absent" : "";
  const label = formatAttendanceStatus(status);
  if (!mod) {
    return <span className="attendance-table__status">{label}</span>;
  }
  return <span className={`attendance-table__status attendance-table__status--${mod}`}>{label}</span>;
}

type StaffSingleMeetingAttendanceStatsProps = {
  attendances: MeetingAttendanceRecord[];
};

export function StaffSingleMeetingAttendanceStats({ attendances }: StaffSingleMeetingAttendanceStatsProps) {
  const total = attendances.length;
  const presentCount = attendances.filter((a) => isPresent(a.status)).length;
  const onTimeCount = attendances.filter((a) => a.status.toLowerCase() === "on_time").length;
  const attendanceRate = total > 0 ? presentCount / total : 0;
  const onTimeRate = presentCount > 0 ? onTimeCount / presentCount : 0;

  const rows = [...attendances]
    .sort((a, b) => {
      const ln = a.user.lastName.localeCompare(b.user.lastName);
      return ln !== 0 ? ln : a.user.firstName.localeCompare(b.user.firstName);
    })
    .map((a) => [`${a.user.firstName} ${a.user.lastName}`, attendanceStatusCell(a.status)]);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="meeting-stats" aria-label="Attendance summary for this meeting">
        <div className="meeting-stats__card">
          <span className="meeting-stats__value">{total}</span>
          <span className="meeting-stats__label">Records</span>
        </div>
        <div className="meeting-stats__card">
          <span className="meeting-stats__value">{total === 0 ? "—" : `${Math.round(attendanceRate * 100)}%`}</span>
          <span className="meeting-stats__label">Present</span>
        </div>
        <div className="meeting-stats__card">
          <span className="meeting-stats__value">
            {presentCount === 0 ? "—" : `${Math.round(onTimeRate * 100)}%`}
          </span>
          <span className="meeting-stats__label">On-time (of present)</span>
        </div>
      </div>

      {total > 0 ? (
        <Table
          className="table staff-single-meeting-attendance__table"
          columnTemplate="minmax(0, 1.4fr) minmax(0, 0.6fr)"
          headers={["Name", "Status"]}
          rows={rows}
        />
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No attendance has been recorded for this meeting.
        </p>
      )}
    </div>
  );
}
