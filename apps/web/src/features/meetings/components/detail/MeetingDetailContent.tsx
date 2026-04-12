"use client";

import { useMeetingWithSettings } from "../../hooks/useMeetingWithSettings";
import { MeetingDetail } from "./MeetingDetail";

type MeetingDetailContentProps = {
  meetingId: number;
  projectId: number;
};

export function MeetingDetailContent({ meetingId, projectId }: MeetingDetailContentProps) {
  const { meeting, settings } = useMeetingWithSettings(meetingId);

  if (!meeting || !settings) return null;

  return (
    <MeetingDetail
      meeting={meeting}
      projectId={projectId}
      permissions={{
        minutesEditWindowDays: settings.minutesEditWindowDays,
        attendanceEditWindowDays: settings.attendanceEditWindowDays,
        allowAnyoneToEditMeetings: settings.allowAnyoneToEditMeetings,
        allowAnyoneToRecordAttendance: settings.allowAnyoneToRecordAttendance,
        allowAnyoneToWriteMinutes: settings.allowAnyoneToWriteMinutes,
      }}
    />
  );
}
