"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { useUser } from "@/features/auth/context";
import { AttendanceTable } from "./AttendanceTable";
import { MinutesEditor } from "./MinutesEditor";
import { CommentSection } from "./CommentSection";
import { markAttendance, saveMinutes } from "../api/client";
import type { Meeting, MeetingAttendanceRecord } from "../types";

type MeetingDetailProps = {
  meeting: Meeting;
};

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  const { user } = useUser();
  const [attendances, setAttendances] = useState<MeetingAttendanceRecord[]>(meeting.attendances);
  const [attendanceStatus, setAttendanceStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);
  const [minutesStatus, setMinutesStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [minutesMsg, setMinutesMsg] = useState<string | null>(null);

  function handleStatusChange(userId: number, status: string) {
    setAttendances((prev) =>
      prev.map((a) => (a.userId === userId ? { ...a, status } : a))
    );
  }

  async function handleSaveAttendance() {
    setAttendanceStatus("loading");
    setAttendanceMsg(null);
    try {
      await markAttendance(
        meeting.id,
        attendances.map((a) => ({ userId: a.userId, status: a.status }))
      );
      setAttendanceStatus("success");
      setAttendanceMsg("Attendance saved!");
    } catch (error) {
      setAttendanceStatus("error");
      setAttendanceMsg(error instanceof Error ? error.message : "Failed to save attendance");
    }
  }

  async function handleSaveMinutes(content: string) {
    setMinutesStatus("loading");
    setMinutesMsg(null);
    try {
      await saveMinutes(meeting.id, user!.id, content);
      setMinutesStatus("success");
      setMinutesMsg("Minutes saved!");
    } catch (error) {
      setMinutesStatus("error");
      setMinutesMsg(error instanceof Error ? error.message : "Failed to save minutes");
    }
  }

  return (
    <div className="stack">
      <Card title={meeting.title}>
        <p>Date: {new Date(meeting.date).toLocaleString()}</p>
        <p>Organiser: {meeting.organiser.firstName} {meeting.organiser.lastName}</p>
        {meeting.location && <p>Location: {meeting.location}</p>}
        {meeting.agenda && (
          <div>
            <h3>Agenda</h3>
            <p>{meeting.agenda}</p>
          </div>
        )}
      </Card>

      <Card title="Attendance">
        <AttendanceTable
          attendances={attendances}
          onStatusChange={handleStatusChange}
          onSave={handleSaveAttendance}
        />
        {attendanceMsg && <p className={attendanceStatus === "error" ? "error" : "muted"}>{attendanceMsg}</p>}
      </Card>

      <Card title="Minutes">
        <MinutesEditor
          initialContent={meeting.minutes?.content ?? ""}
          onSave={handleSaveMinutes}
        />
        {minutesMsg && <p className={minutesStatus === "error" ? "error" : "muted"}>{minutesMsg}</p>}
      </Card>

      <CommentSection meetingId={meeting.id} initialComments={meeting.comments} />
    </div>
  );
}
