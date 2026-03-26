"use client";

import type { StaffMeeting } from "./types";
import { computeMeetingStats, getFlaggedMembers, getMemberAttendanceStats } from "./attendance";
import { MeetingStatsPanel } from "./components/MeetingStatsPanel";
import { LowAttendanceAlert } from "./components/LowAttendanceAlert";
import { MeetingList } from "./components/MeetingList";
import { AttendanceTable } from "./components/AttendanceTable";

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
