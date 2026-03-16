import type { StaffMeeting, MeetingStats, FlaggedMember } from "./types";

export const ABSENCES_BEFORE_ALERT = 3;

export function isPresent(status: string) {
  return ["on_time", "late"].includes(status.toLowerCase());
}

function getConsecutiveAbsences(userId: number, meetings: StaffMeeting[]): number {
  let count = 0;
  for (const meeting of meetings) {
    const attendance = meeting.attendances.find((a) => a.userId === userId);
    if (!attendance) break;
    if (attendance.status.toLowerCase() === "absent") {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function computeMeetingStats(meetings: StaffMeeting[]): MeetingStats {
  const totalMeetings = meetings.length;
  const meetingsWithMinutes = meetings.filter((m) => m.minutes !== null).length;

  if (totalMeetings === 0) return { totalMeetings: 0, avgAttendanceRate: 0, meetingsWithMinutes: 0 };

  const totalPresent = meetings.reduce((sum, m) => sum + m.attendances.filter((a) => isPresent(a.status)).length, 0);
  const totalRecorded = meetings.reduce((sum, m) => sum + m.attendances.length, 0);
  const avgAttendanceRate = totalRecorded > 0 ? totalPresent / totalRecorded : 0;

  return { totalMeetings, avgAttendanceRate, meetingsWithMinutes };
}

export function getFlaggedMembers(meetings: StaffMeeting[]): FlaggedMember[] {
  const memberMap = new Map<number, { id: number; firstName: string; lastName: string }>();
  for (const meeting of meetings) {
    for (const attendance of meeting.attendances) {
      if (!memberMap.has(attendance.userId)) {
        memberMap.set(attendance.userId, attendance.user);
      }
    }
  }

  return [...memberMap.values()]
    .map((user) => ({ ...user, consecutiveAbsences: getConsecutiveAbsences(user.id, meetings) }))
    .filter((m) => m.consecutiveAbsences >= ABSENCES_BEFORE_ALERT)
    .sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences);
}
