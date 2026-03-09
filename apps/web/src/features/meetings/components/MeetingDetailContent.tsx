"use client";

import { useEffect, useState } from "react";
import { getMeeting } from "../api/client";
import { MeetingDetail } from "./MeetingDetail";
import type { Meeting } from "../types";

type MeetingDetailContentProps = {
  meetingId: number;
};

export function MeetingDetailContent({ meetingId }: MeetingDetailContentProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    getMeeting(meetingId).then(setMeeting);
  }, [meetingId]);

  if (!meeting) return null;

  return <MeetingDetail meeting={meeting} />;
}
