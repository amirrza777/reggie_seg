"use client";

import { useState, useEffect } from "react";
import { listMeetings } from "../api/client";
import { MeetingList } from "./MeetingList";
import { CreateMeetingForm } from "./CreateMeetingForm";
import type { Meeting } from "../types";

type Tab = "upcoming" | "previous" | "new";

type MeetingsPageContentProps = {
  teamId: number;
  projectId: number;
  projectCompleted?: boolean;
  initialTab?: Tab;
};

export function MeetingsPageContent({
  teamId,
  projectId,
  projectCompleted = false,
  initialTab = "upcoming",
}: MeetingsPageContentProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    listMeetings(teamId).then(setMeetings);
  }, [teamId]);

  function refreshList() {
    listMeetings(teamId).then(setMeetings);
  }

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.date) >= now);
  const previous = meetings.filter((m) => new Date(m.date) < now);

  return (
    <div className="stack projects-panel">
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
        {!projectCompleted ? (
          <button
            type="button"
            className={`pill-nav__link pill-nav__link--action${tab === "new" ? " pill-nav__link--active" : ""}`}
            onClick={() => {
              setTab("new");
            }}
          >
            New meeting
          </button>
        ) : null}
      </nav>

      {projectCompleted ? (
        <p className="ui-note ui-note--muted">
          Project is completed. Meeting creation is closed.
        </p>
      ) : null}

      {tab === "new" ? (
        <CreateMeetingForm
          teamId={teamId}
          onCreated={() => {
            refreshList();
            setTab("upcoming");
          }}
          onCancel={() => setTab("upcoming")}
        />
      ) : (
        <MeetingList
          meetings={tab === "upcoming" ? upcoming : previous}
          projectId={projectId}
          title={tab === "upcoming" ? "Upcoming meetings" : "Previous meetings"}
          showMinutesWriter={tab === "previous"}
          emptyMessage={
            tab === "upcoming"
              ? "There are no scheduled meetings to list at this time."
              : "No previous meetings."
          }
        />
      )}
    </div>
  );
}
