"use client";

import { useEffect, useState } from "react";
import { getMeeting, getMeetingSettings } from "../api/client";
import { MeetingDetail } from "./MeetingDetail";
import type { Meeting, MeetingPermissions } from "../types";

type MeetingDetailContentProps = {
  meetingId: number;
  projectId: number;
};

export function MeetingDetailContent({ meetingId, projectId }: MeetingDetailContentProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [permissions, setPermissions] = useState<MeetingPermissions | null>(null);

  useEffect(() => {
    Promise.all([getMeeting(meetingId), getMeetingSettings(meetingId)]).then(([m, s]) => {
      setMeeting(m);
      setPermissions({
        minutesEditWindowDays: s.minutesEditWindowDays,
        attendanceEditWindowDays: s.attendanceEditWindowDays,
        allowAnyoneToEditMeetings: s.allowAnyoneToEditMeetings,
        allowAnyoneToRecordAttendance: s.allowAnyoneToRecordAttendance,
        allowAnyoneToWriteMinutes: s.allowAnyoneToWriteMinutes,
      });
    });
  }, [meetingId]);

  if (!meeting || !permissions) return null;

  return <MeetingDetail meeting={meeting} projectId={projectId} permissions={permissions} />;
}
