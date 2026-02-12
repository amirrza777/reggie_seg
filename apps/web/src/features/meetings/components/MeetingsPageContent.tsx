"use client";

import { useState, useEffect } from "react";
import { listMeetings, getMeeting } from "../api/client";
import { MeetingList } from "./MeetingList";
import { CreateMeetingForm } from "./CreateMeetingForm";
import { MeetingDetail } from "./MeetingDetail";
import type { Meeting } from "../types";

type MeetingsPageContentProps = {
  teamId: number;
};

export function MeetingsPageContent({ teamId }: MeetingsPageContentProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    listMeetings(teamId).then(setMeetings);
  }, [teamId]);

  async function handleSelect(meetingId: number) {
    const meeting = await getMeeting(meetingId);
    setSelectedMeeting(meeting);
  }

  function refreshList() {
    listMeetings(teamId).then(setMeetings);
  }

  return (
    <div className="stack">
      <MeetingList
        meetings={meetings}
        onSelect={handleSelect}
        onCreateNew={() => setShowCreateForm(true)}
      />
      {showCreateForm && (
        <CreateMeetingForm teamId={teamId} onCreated={refreshList} onCancel={() => setShowCreateForm(false)} />
      )}
      {selectedMeeting && <MeetingDetail meeting={selectedMeeting} />}
    </div>
  );
}
