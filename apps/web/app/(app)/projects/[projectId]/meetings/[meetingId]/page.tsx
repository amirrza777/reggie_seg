"use client";

import { use, useEffect, useState } from "react";
import { getMeeting } from "@/features/meetings/api/client";
import { MeetingDetail } from "@/features/meetings/components/MeetingDetail";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import type { Meeting } from "@/features/meetings/types";

type MeetingPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default function MeetingPage({ params }: MeetingPageProps) {
  const { projectId, meetingId } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    getMeeting(Number(meetingId)).then(setMeeting);
  }, [meetingId]);

  if (!meeting) return null;

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <MeetingDetail meeting={meeting} />
    </div>
  );
}
