"use client";

import { Card } from "@/shared/ui/Card";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { formatDate } from "@/shared/lib/formatDate";
import type { Meeting } from "../types";

type MeetingListProps = {
  meetings: Meeting[];
  projectId: number;
  title?: string;
  emptyMessage?: string;
};

export function MeetingList({ meetings, projectId, title = "Meetings", emptyMessage }: MeetingListProps) {
  return (
    <Card title={title}>
      {meetings.length === 0 ? (
        <p className="muted">{emptyMessage ?? "No meetings to show."}</p>
      ) : (
        <div className="table">
          <div className="table__head">
            <div>Title</div>
            <div>Date</div>
            <div>Organiser</div>
            <div>Location</div>
          </div>
          {meetings.map((meeting) => (
            <AnchorLink
              key={meeting.id}
              href={`/projects/${projectId}/meetings/${meeting.id}`}
              className="table__row"
            >
              <div>{meeting.title}</div>
              <div>{formatDate(meeting.date)}</div>
              <div>{meeting.organiser.firstName} {meeting.organiser.lastName}</div>
              <div>{meeting.location ?? ""}</div>
            </AnchorLink>
          ))}
        </div>
      )}
    </Card>
  );
}
