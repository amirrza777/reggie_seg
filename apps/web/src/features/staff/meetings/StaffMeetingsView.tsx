"use client";

import type { StaffMeeting } from "./types";
import { computeMeetingStats, getFlaggedMembers } from "./attendance";
import { MeetingStatsPanel } from "./components/MeetingStatsPanel";
import { LowAttendanceAlert } from "./components/LowAttendanceAlert";
import { MeetingList } from "./components/MeetingList";

type StaffMeetingsViewProps = {
  meetings: StaffMeeting[];
};

export function StaffMeetingsView({ meetings }: StaffMeetingsViewProps) {
  const stats = computeMeetingStats(meetings);
  const flaggedMembers = getFlaggedMembers(meetings);

  return (
    <div className="stack">
      <MeetingStatsPanel stats={stats} />
      <LowAttendanceAlert flaggedMembers={flaggedMembers} />
      <MeetingList meetings={meetings} />
    </div>
  );
}
