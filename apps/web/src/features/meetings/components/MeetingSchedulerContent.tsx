"use client";

import { useState, useEffect } from "react";
import { listMeetings } from "../api/client";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { CreateMeetingForm } from "./CreateMeetingForm";
import { formatDate } from "@/shared/lib/formatDate";
import type { Meeting } from "../types";

type Tab = "upcoming" | "previous";

type MeetingSchedulerContentProps = {
  teamId: number;
  projectId: number;
};

export function MeetingSchedulerContent({ teamId, projectId }: MeetingSchedulerContentProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    listMeetings(teamId).then(setMeetings);
  }, [teamId]);

  function refreshList() {
    listMeetings(teamId).then(setMeetings);
  }

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.date) >= now);
  const previous = meetings.filter((m) => new Date(m.date) < now);
  const displayed = tab === "upcoming" ? upcoming : previous;

  return (
    <div className="stack">
      <nav className="pill-nav">
        <button
          type="button"
          className={`pill-nav__link${tab === "upcoming" ? " pill-nav__link--active" : ""}`}
          onClick={() => setTab("upcoming")}
        >
          Upcoming meetings
        </button>
        <button
          type="button"
          className={`pill-nav__link${tab === "previous" ? " pill-nav__link--active" : ""}`}
          onClick={() => setTab("previous")}
        >
          Previous meetings
        </button>
      </nav>

      <Card title={tab === "upcoming" ? "Upcoming scheduled meetings" : "Previous meetings"}>
        {displayed.length === 0 ? (
          <p className="muted">
            {tab === "upcoming"
              ? "There are no scheduled meetings to list at this time."
              : "No previous meetings."}
          </p>
        ) : (
          <div className="table">
            <div className="table__head">
              <div>Title</div>
              <div>Date</div>
              <div>Organiser</div>
              <div>Location</div>
            </div>
            {displayed.map((meeting) => (
              <AnchorLink
                key={meeting.id}
                href={`/projects/${projectId}/meetings/${meeting.id}`}
                className="table__row"
              >
                <div>{meeting.title}</div>
                <div>{formatDate(meeting.date)}</div>
                <div>
                  {meeting.organiser.firstName} {meeting.organiser.lastName}
                </div>
                <div>{meeting.location ?? ""}</div>
              </AnchorLink>
            ))}
          </div>
        )}
        <div>
          <Button type="button" onClick={() => setShowCreateForm(true)}>
            + Schedule team meeting
          </Button>
        </div>
      </Card>

      {showCreateForm && (
        <CreateMeetingForm
          teamId={teamId}
          onCreated={() => {
            refreshList();
            setShowCreateForm(false);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
