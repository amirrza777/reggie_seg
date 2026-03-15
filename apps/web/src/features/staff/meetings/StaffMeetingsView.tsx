"use client";

import type { StaffMeeting } from "./types";
import { computeMeetingStats, getFlaggedMembers } from "./attendance";
import { MeetingStatsPanel } from "./components/MeetingStatsPanel";
import { LowAttendanceAlert } from "./components/LowAttendanceAlert";
import { MeetingList } from "./components/MeetingList";
import { Calendar } from "@/shared/ui/Calendar";

type StaffMeetingsViewProps = {
  meetings: StaffMeeting[];
};

export function StaffMeetingsView({ meetings }: StaffMeetingsViewProps) {
  const stats = computeMeetingStats(meetings);
  const flaggedMembers = getFlaggedMembers(meetings);
  const calendarEvents = meetings.map((m) => ({ id: m.id, date: m.date, title: m.title }));

  return (
    <div className="stack">
      <MeetingStatsPanel stats={stats} />
      <LowAttendanceAlert flaggedMembers={flaggedMembers} />
      <Calendar events={calendarEvents} />
      <MeetingList meetings={meetings} />
    </div>
  );
}
