"use client";

import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { formatDate } from "@/shared/lib/formatDate";
import type { Meeting } from "../types";

type MeetingListProps = {
  meetings: Meeting[];
  onSelect: (meetingId: number) => void;
  onCreateNew: () => void;
};

export function MeetingList({ meetings, onSelect, onCreateNew }: MeetingListProps) {
  return (
    <Card title="Meetings">
      <div>
        <Button type="button" onClick={onCreateNew}>
          New Meeting
        </Button>
      </div>
      <div className="table">
        <div className="table__head">
          <div>Title</div>
          <div>Date</div>
          <div>Organiser</div>
          <div>Location</div>
        </div>
        {meetings.map((meeting) => (
          <div
            className="table__row"
            key={meeting.id}
            onClick={() => onSelect(meeting.id)}
            style={{ cursor: "pointer" }}
          >
            <div>{meeting.title}</div>
            <div>{formatDate(meeting.date)}</div>
            <div>{meeting.organiser.firstName} {meeting.organiser.lastName}</div>
            <div>{meeting.location ?? ""}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
