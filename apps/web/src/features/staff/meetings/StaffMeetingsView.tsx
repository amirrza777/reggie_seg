"use client";

import type { StaffMeeting } from "./types";
import { computeMeetingStats, getFlaggedMembers } from "./attendance";
import { MeetingStatsPanel } from "./components/MeetingStatsPanel";
import { LowAttendanceAlert } from "./components/LowAttendanceAlert";
import { MeetingList } from "./components/MeetingList";
import { CalendarGrid } from "@/features/calendar/components/CalendarGrid";

type StaffMeetingsViewProps = {
  meetings: StaffMeeting[];
};

export function StaffMeetingsView({ meetings }: StaffMeetingsViewProps) {
  const stats = computeMeetingStats(meetings);
  const flaggedMembers = getFlaggedMembers(meetings);
  const calendarEvents = meetings.map((m) => ({ id: String(m.id), date: m.date, title: m.title, type: "meeting" as const }));

  return (
    <div className="stack">
      <MeetingStatsPanel stats={stats} />
      <LowAttendanceAlert flaggedMembers={flaggedMembers} />
      <div className="meetings-calendar-layout">
        <CalendarGrid events={calendarEvents} initialDate={meetings[0]?.date} showLegend={false} showUpcomingList={false} />
        <MeetingList meetings={meetings} />
      </div>
    </div>
  );
}
