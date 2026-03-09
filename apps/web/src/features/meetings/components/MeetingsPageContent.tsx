"use client";

import { useState, useEffect } from "react";
import { listMeetings } from "../api/client";
import { MeetingList } from "./MeetingList";
import { CreateMeetingForm } from "./CreateMeetingForm";
import type { Meeting } from "../types";

type MeetingsPageContentProps = {
  teamId: number;
  projectId: number;
};

export function MeetingsPageContent({ teamId, projectId }: MeetingsPageContentProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    listMeetings(teamId).then(setMeetings);
  }, [teamId]);

  function refreshList() {
    listMeetings(teamId).then(setMeetings);
  }

  return (
    <div className="stack">
      <MeetingList
        meetings={meetings}
        projectId={projectId}
        onCreateNew={() => setShowCreateForm(true)}
      />
      {showCreateForm && (
        <CreateMeetingForm
          teamId={teamId}
          onCreated={() => { refreshList(); setShowCreateForm(false); }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
