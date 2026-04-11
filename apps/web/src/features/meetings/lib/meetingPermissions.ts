import { isMeetingMember } from "./meetingMember";
import { isWithinEditWindow } from "./meetingTime";
import type { Meeting, MeetingPermissions } from "../types";

export function getMeetingPermissions(
  meeting: Meeting,
  permissions: MeetingPermissions | null,
  userId: number | null,
  canEdit: boolean,
) {
  const isOrganiser = userId != null && userId === meeting.organiser.id;
  const isMember =
    userId != null
      ? isMeetingMember(meeting.team?.allocations ?? [], userId)
      : false;
  const canEditMeeting =
    canEdit &&
    (isOrganiser || (!!permissions?.allowAnyoneToEditMeetings && isMember));
  const canRecordAttendance =
    canEdit &&
    (isOrganiser || (!!permissions?.allowAnyoneToRecordAttendance && isMember));
  const canWriteMinutes =
    canEdit &&
    (!meeting.minutes ||
      meeting.minutes.writerId === userId ||
      (!!permissions?.allowAnyoneToWriteMinutes && isMember));
  const minutesWindowOpen =
    (permissions?.minutesEditWindowDays ?? 0) > 0 &&
    isWithinEditWindow(meeting.date, permissions!.minutesEditWindowDays);
  const attendanceWindowOpen =
    (permissions?.attendanceEditWindowDays ?? 0) > 0 &&
    isWithinEditWindow(meeting.date, permissions!.attendanceEditWindowDays);

  return {
    canEditMeeting,
    canRecordAttendance,
    canWriteMinutes,
    minutesWindowOpen,
    attendanceWindowOpen,
  };
}
