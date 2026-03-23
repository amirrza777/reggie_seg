import type { Meeting } from "@/features/meetings/types";

export type StaffMeeting = Omit<Meeting, "team">;

export type MeetingStats = {
  totalMeetings: number;
  avgAttendanceRate: number;
  onTimeRate: number;
};

export type FlaggedMember = {
  id: number;
  firstName: string;
  lastName: string;
  consecutiveAbsences: number;
};
