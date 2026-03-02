"use client";

import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { formatDate } from "@/shared/lib/formatDate";
import type { Meeting } from "../types";

type MeetingListProps = {
  meetings: Meeting[];
  projectId: number;
  onCreateNew: () => void;
};

export function MeetingList({ meetings, projectId, onCreateNew }: MeetingListProps) {
  return (
    <Card title="Meetings">
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
      <div>
        <Button type="button" onClick={onCreateNew}>
          New Meeting
        </Button>
      </div>
    </Card>
  );
}
