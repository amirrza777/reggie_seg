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
};

export function MeetingsPageContent({ teamId, projectId }: MeetingsPageContentProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");

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
    <div className="stack projects-panel">
      <header className="projects-panel__header">
        <h1 className="projects-panel__title">Team meetings</h1>
        <p className="projects-panel__subtitle">Schedule, review, and manage meetings for your project team.</p>
      </header>
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
        <button
          type="button"
          className={`pill-nav__link pill-nav__link--action${tab === "new" ? " pill-nav__link--active" : ""}`}
          onClick={() => setTab("new")}
        >
          New meeting
        </button>
      </nav>

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
          meetings={displayed}
          projectId={projectId}
          title={tab === "upcoming" ? "Upcoming meetings" : "Previous meetings"}
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
