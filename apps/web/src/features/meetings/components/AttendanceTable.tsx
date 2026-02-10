"use client";

import { Button } from "@/shared/ui/Button";
import type { MeetingAttendanceRecord } from "../types";

type AttendanceTableProps = {
  attendances: MeetingAttendanceRecord[];
  onStatusChange: (userId: number, status: string) => void;
  onSave: () => void;
};

export function AttendanceTable({ attendances, onStatusChange, onSave }: AttendanceTableProps) {
  return (
    <div>
      <div className="table">
        <div className="table__head">
          <div>Name</div>
          <div>Status</div>
        </div>
        {attendances.map((record) => (
          <div className="table__row" key={record.userId}>
            <div>{record.user.firstName} {record.user.lastName}</div>
            <div>
              <select
                value={record.status}
                onChange={(e) => onStatusChange(record.userId, e.target.value)}
              >
                <option value="absent">Absent</option>
                <option value="on_time">On Time</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>
          </div>
        ))}
      </div>
      <div>
        <Button type="button" onClick={onSave}>
          Save Attendance
        </Button>
      </div>
    </div>
  );
}
