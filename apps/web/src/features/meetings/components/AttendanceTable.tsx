"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { markAttendance } from "../api/client";
import type { MeetingAttendanceRecord } from "../types";

type Member = {
  id: number;
  firstName: string;
  lastName: string;
};

type AttendanceTableProps = {
  meetingId: number;
  members: Member[];
  initialAttendances: MeetingAttendanceRecord[];
};

function buildAttendanceList(members: Member[], initialAttendances: MeetingAttendanceRecord[]): MeetingAttendanceRecord[] {
  const existingByUserId = new Map(initialAttendances.map((a) => [a.userId, a]));

  return members.map((member) => {
    const existing = existingByUserId.get(member.id);
    if (existing) return existing;

    return {
      id: 0,
      meetingId: 0,
      userId: member.id,
      status: "absent",
      user: member,
    };
  });
}

export function AttendanceTable({ meetingId, members, initialAttendances }: AttendanceTableProps) {
  const [attendances, setAttendances] = useState(() => buildAttendanceList(members, initialAttendances));
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
    <Card title="Attendance" bodyClassName="stack">
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
      <div className="ui-row">
        <Button type="button" onClick={handleSave} disabled={status === "loading"}>
          {status === "loading" ? "Saving..." : "Save Attendance"}
        </Button>
        {message && <span className={status === "error" ? "error" : "muted"}>{message}</span>}
      </div>
    </Card>
  );
}
