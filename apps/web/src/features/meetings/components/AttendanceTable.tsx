"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { markAttendance } from "../api/client";
import type { MeetingAttendanceRecord } from "../types";

type AttendanceTableProps = {
  meetingId: number;
  initialAttendances: MeetingAttendanceRecord[];
};

export function AttendanceTable({ meetingId, initialAttendances }: AttendanceTableProps) {
  const [attendances, setAttendances] = useState(initialAttendances);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function handleStatusChange(userId: number, newStatus: string) {
    setAttendances((prev) =>
      prev.map((a) => (a.userId === userId ? { ...a, status: newStatus } : a))
    );
  }

  async function handleSave() {
    setStatus("loading");
    setMessage(null);
    try {
      await markAttendance(
        meetingId,
        attendances.map((a) => ({ userId: a.userId, status: a.status }))
      );
      setStatus("success");
      setMessage("Attendance saved!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to save attendance");
    }
  }

  return (
    <Card title="Attendance">
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
                value={record.status.toLowerCase()}
                onChange={(e) => handleStatusChange(record.userId, e.target.value)}
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
        <Button type="button" onClick={handleSave} disabled={status === "loading"}>
          {status === "loading" ? "Saving..." : "Save Attendance"}
        </Button>
      </div>
      {message && <p className={status === "error" ? "error" : "muted"}>{message}</p>}
    </Card>
  );
}
