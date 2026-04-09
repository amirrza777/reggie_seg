"use client";

import type { StaffMeeting } from "../types";
import { computeMeetingStats, getFlaggedMembers, getMemberAttendanceStats } from "../lib/attendance";
import { MeetingStatsPanel } from "./MeetingStatsPanel";
import { LowAttendanceAlert } from "./LowAttendanceAlert";
import { MeetingList } from "./MeetingList";
import { AttendanceTable } from "./AttendanceTable";

type StaffMeetingsViewProps = {
  meetings: StaffMeeting[];
  absenceThreshold: number;
};

export function StaffMeetingsView({ meetings, absenceThreshold }: StaffMeetingsViewProps) {
  const stats = computeMeetingStats(meetings);
  const flaggedMembers = getFlaggedMembers(meetings, absenceThreshold);
  const memberAttendance = getMemberAttendanceStats(meetings, absenceThreshold);

  return (
    <div className="stack">
      <MeetingStatsPanel stats={stats} />
      <LowAttendanceAlert flaggedMembers={flaggedMembers} absenceThreshold={absenceThreshold} />
      <MeetingList meetings={meetings} />
      <AttendanceTable members={memberAttendance} />
    </div>
  );
}
