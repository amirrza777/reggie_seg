"use client";

import { useState, useEffect } from "react";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { listMeetings, getTeamMeetingSettings } from "../api/client";
import { MeetingList } from "./MeetingList";
import { CreateMeetingForm } from "./forms/CreateMeetingForm";
import type { Meeting, MeetingPermissions } from "../types";

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
  const { canEdit: workspaceCanEdit } = useProjectWorkspaceCanEdit();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [permissions, setPermissions] = useState<MeetingPermissions | null>(null);
  const [tab, setTab] = useState<Tab>(projectCompleted && initialTab === "upcoming" ? "previous" : initialTab);

  const meetingsAllowEdits = workspaceCanEdit && !projectCompleted;

  useEffect(() => {
    if (!meetingsAllowEdits && tab === "new") {
      setTab(projectCompleted ? "previous" : "upcoming");
    }
    if (projectCompleted && tab === "upcoming") {
      setTab("previous");
    }
  }, [meetingsAllowEdits, projectCompleted, tab]);

  useEffect(() => {
    Promise.all([listMeetings(teamId), getTeamMeetingSettings(teamId)]).then(([m, s]) => {
      setMeetings(m);
      setPermissions({
        minutesEditWindowDays: s.minutesEditWindowDays,
        attendanceEditWindowDays: s.attendanceEditWindowDays,
        allowAnyoneToEditMeetings: s.allowAnyoneToEditMeetings,
        allowAnyoneToRecordAttendance: s.allowAnyoneToRecordAttendance,
        allowAnyoneToWriteMinutes: s.allowAnyoneToWriteMinutes,
      });
    });
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
        {!projectCompleted ? (
          <button
            type="button"
            className={`pill-nav__link${tab === "upcoming" ? " pill-nav__link--active" : ""}`}
            onClick={() => setTab("upcoming")}
          >
            Upcoming meetings
          </button>
        ) : null}
        <button
          type="button"
          className={`pill-nav__link${tab === "previous" ? " pill-nav__link--active" : ""}`}
          onClick={() => setTab("previous")}
        >
          Previous meetings
        </button>
        {meetingsAllowEdits ? (
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

      {!meetingsAllowEdits ? (
        <p className="ui-note ui-note--muted">
          {projectCompleted
            ? "Project is completed. Meeting creation is closed."
            : "This project is archived; meetings are view-only."}
        </p>
      ) : null}

      {tab === "new" && meetingsAllowEdits ? (
        <CreateMeetingForm
          teamId={teamId}
          onCreated={() => {
            refreshList();
              setTab("upcoming");
            }}
          onCancel={() => setTab(projectCompleted ? "previous" : "upcoming")}
        />
      ) : (
        <MeetingList
          meetings={tab === "upcoming" ? upcoming : previous}
          projectId={projectId}
          title={tab === "upcoming" ? "Upcoming meetings" : "Previous meetings"}
          showMinutesWriter={tab === "previous"}
          permissions={permissions}
          workspaceReadOnly={!meetingsAllowEdits}
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
