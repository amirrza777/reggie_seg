import { useEffect, useState } from "react";
import { getMeeting, getMeetingSettings } from "../api/client";
import type { Meeting } from "../types";

type MeetingSettings = {
  absenceThreshold: number;
  minutesEditWindowDays: number;
  attendanceEditWindowDays: number;
  allowAnyoneToEditMeetings: boolean;
  allowAnyoneToRecordAttendance: boolean;
  allowAnyoneToWriteMinutes: boolean;
};

export function useMeetingWithSettings(meetingId: number) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [settings, setSettings] = useState<MeetingSettings | null>(null);

  useEffect(() => {
    Promise.all([getMeeting(meetingId), getMeetingSettings(meetingId)]).then(
      ([m, s]) => {
        setMeeting(m);
        setSettings(s);
      }
    );
  }, [meetingId]);

  return { meeting, settings };
}
