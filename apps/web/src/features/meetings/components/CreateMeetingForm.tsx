"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { useUser } from "@/features/auth/context";
import { createMeeting, listTeamMembers } from "../api/client";
import "../styles/meeting-list.css";

type TeamMember = {
  id: number;
  firstName: string;
  lastName: string;
};

type CreateMeetingFormProps = {
  teamId: number;
  onCreated: () => void;
  onCancel: () => void;
};

export function CreateMeetingForm({ teamId, onCreated, onCancel }: CreateMeetingFormProps) {
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [subject, setSubject] = useState("");
  const [location, setLocation] = useState("");
  const [videoCallLink, setVideoCallLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteAll, setInviteAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    listTeamMembers(teamId).then((data) => {
      setMembers(data);
      setSelectedIds(new Set(data.map((m) => m.id)));
    });
  }, [teamId]);

  function toggleParticipant(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    setStatus("loading");
    setMessage(null);

    try {
      await createMeeting({
        teamId,
        organiserId: user!.id,
        title,
        date,
        subject: subject || undefined,
        location: location || undefined,
        videoCallLink: videoCallLink || undefined,
        agenda: agenda || undefined,
        participantIds: inviteAll ? undefined : Array.from(selectedIds),
      });
      setStatus("success");
      setMessage("Meeting created!");
      setTitle("");
      setDate("");
      setSubject("");
      setLocation("");
      setVideoCallLink("");
      setAgenda("");
      onCreated();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to create meeting");
    }
  }

  return (
    <Card title="New Meeting">
      <form className="stack" onSubmit={handleSubmit}>
        <label className="stack">
          <span>Title *</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="stack">
          <span>Date *</span>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="stack">
          <span>Subject</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="stack">
          <span>Location</span>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="stack">
          <span>Video call link</span>
          <input type="url" value={videoCallLink} onChange={(e) => setVideoCallLink(e.target.value)} placeholder="https://meet.google.com/..." />
        </label>
        <label className="stack">
          <span>Agenda</span>
          <textarea rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
        </label>
        {members.length > 0 && (
          <div className="stack">
            <span>Participants</span>
            <label className="meeting-form__participant-item">
              <input
                type="checkbox"
                checked={inviteAll}
                onChange={(e) => setInviteAll(e.target.checked)}
              />
              Invite all team members
            </label>
            {!inviteAll && (
              <div className="meeting-form__participant-list">
                {members.map((member) => (
                  <label key={member.id} className="meeting-form__participant-item">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.id)}
                      onChange={() => toggleParticipant(member.id)}
                    />
                    {member.firstName} {member.lastName}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="ui-row">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={status === "loading" || !user}>
            {status === "loading" ? "Creating..." : "Create Meeting"}
          </Button>
        </div>
        {message && <p className={status === "error" ? "error" : "muted"}>{message}</p>}
      </form>
    </Card>
  );
}
