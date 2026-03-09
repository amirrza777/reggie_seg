"use client";

import { Card } from "@/shared/ui/Card";
import { useUser } from "@/features/auth/context";
import { AttendanceTable } from "./AttendanceTable";
import { MeetingMinutes } from "./MeetingMinutes";
import { CommentSection } from "./CommentSection";
import type { Meeting } from "../types";

type MeetingDetailProps = {
  meeting: Meeting;
};

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  const { user } = useUser();

  return (
    <div className="stack">
      <Card title={meeting.title}>
        <p>Date: {new Date(meeting.date).toLocaleString()}</p>
        <p>Organiser: {meeting.organiser.firstName} {meeting.organiser.lastName}</p>
        {meeting.location && <p>Location: {meeting.location}</p>}
        {meeting.agenda && (
          <div>
            <h3>Agenda</h3>
            <p>{meeting.agenda}</p>
          </div>
        )}
      </Card>

      <AttendanceTable meetingId={meeting.id} initialAttendances={meeting.attendances} />

      {user && (
        <Card title="Minutes">
          <MeetingMinutes
            meetingId={meeting.id}
            writerId={user.id}
            initialContent={meeting.minutes?.content ?? ""}
          />
        </Card>
      )}

      <CommentSection
        meetingId={meeting.id}
        teamId={meeting.teamId}
        members={meeting.attendances.map((a) => a.user)}
        initialComments={meeting.comments}
      />
    </div>
  );
}
