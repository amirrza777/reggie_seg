"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { useUser } from "@/features/auth/useUser";
import { listTeamMembers } from "../api/client";
import { submitCreateMeeting } from "./CreateMeetingForm.submit";
import { useParticipantSelection } from "../hooks/useParticipantSelection";
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

type CreateMeetingFieldErrors = {
  title?: string;
  date?: string;
};

export function CreateMeetingForm({ teamId, onCreated, onCancel }: CreateMeetingFormProps) {
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [subject, setSubject] = useState("");
  const [location, setLocation] = useState("");
  const [videoCallLink, setVideoCallLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CreateMeetingFieldErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const { inviteAll, setInviteAll, selectedIds, toggleParticipant, selectAll } =
    useParticipantSelection({ initialSelectedIds: [], initialInviteAll: true });

  useEffect(() => {
    listTeamMembers(teamId).then((data) => {
      setMembers(data);
      selectAll(data.map((member) => member.id));
    });
  }, [teamId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const result = await submitCreateMeeting({
      teamId,
      userId: user?.id ?? null,
      title,
      date,
      subject,
      location,
      videoCallLink,
      agenda,
      inviteAll,
      selectedIds: Array.from(selectedIds),
    });

    setStatus(result.status);
    setMessage(result.message);
    setFieldErrors(result.fieldErrors);

    if (result.success) {
      setTitle("");
      setDate("");
      setSubject("");
      setLocation("");
      setVideoCallLink("");
      setAgenda("");
      onCreated();
    }
  }

  return (
    <Card title="New Meeting">
      <form className="stack" onSubmit={handleSubmit}>
        <label className="stack" htmlFor="create-meeting-title">
          <span>Title *</span>
          {fieldErrors.title ? <p className="ui-note ui-note--error">{fieldErrors.title}</p> : null}
          <input
            id="create-meeting-title"
            type="text"
            value={title}
            aria-invalid={fieldErrors.title ? true : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title && e.target.value.trim()) {
                setFieldErrors((prev) => ({ ...prev, title: undefined }));
              }
            }}
          />
        </label>
        <label className="stack" htmlFor="create-meeting-date">
          <span>Date *</span>
          {fieldErrors.date ? <p className="ui-note ui-note--error">{fieldErrors.date}</p> : null}
          <input
            id="create-meeting-date"
            type="datetime-local"
            value={date}
            aria-invalid={fieldErrors.date ? true : undefined}
            onChange={(e) => {
              setDate(e.target.value);
              if (fieldErrors.date && e.target.value.trim()) {
                setFieldErrors((prev) => ({ ...prev, date: undefined }));
              }
            }}
          />
        </label>
        <label className="stack" htmlFor="create-meeting-subject">
          <span>Subject</span>
          <input id="create-meeting-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="stack" htmlFor="create-meeting-location">
          <span>Location</span>
          <input id="create-meeting-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="stack" htmlFor="create-meeting-video-link">
          <span>Video call link</span>
          <input
            id="create-meeting-video-link"
            type="url"
            value={videoCallLink}
            onChange={(e) => setVideoCallLink(e.target.value)}
            placeholder="https://meet.google.com/..."
          />
        </label>
        <div className="stack">
          <span>Agenda</span>
          <RichTextEditor initialContent={agenda} onChange={setAgenda} placeholder="Outline the meeting agenda..." />
        </div>
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
