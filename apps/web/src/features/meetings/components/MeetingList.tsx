"use client";

import { Card } from "@/shared/ui/Card";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { Button } from "@/shared/ui/Button";
import { formatDate } from "@/shared/lib/formatDate";
import type { Meeting } from "../types";

type MeetingListProps = {
  meetings: Meeting[];
  projectId: number;
  title?: string;
  emptyMessage?: string;
  onCreateNew?: () => void;
};

export function MeetingList({
  meetings,
  projectId,
  title = "Meetings",
  emptyMessage,
  onCreateNew,
}: MeetingListProps) {
  const action = onCreateNew ? (
    <Button type="button" variant="ghost" size="sm" onClick={onCreateNew}>
      New meeting
    </Button>
  ) : null;

  return (
    <Card title={title} action={action}>
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
