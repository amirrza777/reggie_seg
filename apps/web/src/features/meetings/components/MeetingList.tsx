"use client";

import { Eye, Video } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { formatDate } from "@/shared/lib/formatDate";
import "../styles/meeting-list.css";
import type { Meeting } from "../types";

type MeetingListProps = {
  meetings: Meeting[];
  projectId: number;
  title?: string;
  emptyMessage?: string;
};

function isUpcoming(meeting: Meeting) {
  return new Date(meeting.date) >= new Date();
}

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
            <div />
          </div>
          {meetings.map((meeting) => (
            <div key={meeting.id} className="table__row">
              <div>{meeting.title}</div>
              <div>{formatDate(meeting.date)}</div>
              <div>{meeting.organiser.firstName} {meeting.organiser.lastName}</div>
              <div>{meeting.location ?? ""}</div>
              <div className="meeting-list__actions">
                <AnchorLink
                  href={`/projects/${projectId}/meetings/${meeting.id}`}
                  className="meeting-list__action"
                  aria-label="View meeting"
                >
                  <Eye size={16} />
                </AnchorLink>
                {meeting.videoCallLink && isUpcoming(meeting) && (
                  <a
                    href={meeting.videoCallLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meeting-list__action meeting-list__action--join"
                    aria-label="Join video call"
                  >
                    <Video size={16} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
