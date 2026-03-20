import type { StaffMeeting, MeetingStats, FlaggedMember } from "../types";

export const ABSENCES_BEFORE_ALERT = 3;

export function isPresent(status: string) {
  return ["on_time", "late"].includes(status.toLowerCase());
}

function getConsecutiveAbsences(userId: number, meetings: StaffMeeting[]): number {
  let count = 0;
  for (const meeting of meetings) {
    const attendance = meeting.attendances.find((a) => a.userId === userId);
    if (!attendance) break; // stop here, gaps in records should not carry the streak forward
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

  if (totalMeetings === 0) return { totalMeetings: 0, avgAttendanceRate: 0, onTimeRate: 0 };

  const totalPresent = meetings.reduce((sum, m) => sum + m.attendances.filter((a) => isPresent(a.status)).length, 0);
  const totalRecorded = meetings.reduce((sum, m) => sum + m.attendances.length, 0);
  const avgAttendanceRate = totalRecorded > 0 ? totalPresent / totalRecorded : 0;

  const totalOnTime = meetings.reduce((sum, m) => sum + m.attendances.filter((a) => a.status.toLowerCase() === "on_time").length, 0);
  const onTimeRate = totalPresent > 0 ? totalOnTime / totalPresent : 0;

  return { totalMeetings, avgAttendanceRate, onTimeRate };
}

export type MemberAttendance = {
  id: number;
  firstName: string;
  lastName: string;
  attended: number;
  total: number;
  lastStatus: string | null;
  atRisk: boolean;
};

export function getMemberAttendanceStats(meetings: StaffMeeting[]): MemberAttendance[] {
  const memberMap = new Map<number, MemberAttendance>();

  for (const meeting of meetings) {
    for (const record of meeting.attendances) {
      if (!memberMap.has(record.userId)) {
        memberMap.set(record.userId, {
          id: record.userId,
          firstName: record.user.firstName,
          lastName: record.user.lastName,
          attended: 0,
          total: 0,
          lastStatus: null,
          atRisk: false,
        });
      }
      const entry = memberMap.get(record.userId)!;
      entry.total += 1;
      if (isPresent(record.status)) entry.attended += 1;
      if (entry.lastStatus === null) entry.lastStatus = record.status;
    }
  }

  return [...memberMap.values()]
    .map((m) => ({ ...m, atRisk: getConsecutiveAbsences(m.id, meetings) >= ABSENCES_BEFORE_ALERT }))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
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
