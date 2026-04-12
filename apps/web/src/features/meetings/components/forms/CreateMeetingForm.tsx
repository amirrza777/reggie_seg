"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { useUser } from "@/features/auth/useUser";
import { listTeamMembers } from "../../api/client";
import { useParticipantSelection } from "../../hooks/useParticipantSelection";
import { submitCreateMeeting } from "./CreateMeetingForm.submit";
import "../../styles/meeting-list.css";

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

type CreateMeetingStatus = "idle" | "loading" | "success" | "error";

type MeetingFieldState = {
  title: string;
  setTitle: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  videoCallLink: string;
  setVideoCallLink: (value: string) => void;
  agenda: string;
  setAgenda: (value: string) => void;
  resetForm: () => void;
};

type CreateMeetingModel = {
  teamId: number;
  onCreated: () => void;
  userId: number | null;
  fieldState: MeetingFieldState;
  inviteAll: boolean;
  selectedIds: Set<number>;
  fieldErrors: CreateMeetingFieldErrors;
  setFieldErrors: React.Dispatch<React.SetStateAction<CreateMeetingFieldErrors>>;
  setStatus: React.Dispatch<React.SetStateAction<CreateMeetingStatus>>;
  setMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

function useMeetingFieldState(): MeetingFieldState {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [subject, setSubject] = useState("");
  const [location, setLocation] = useState("");
  const [videoCallLink, setVideoCallLink] = useState("");
  const [agenda, setAgenda] = useState("");

  function resetForm() {
    setTitle("");
    setDate("");
    setSubject("");
    setLocation("");
    setVideoCallLink("");
    setAgenda("");
  }

  return { title, setTitle, date, setDate, subject, setSubject, location, setLocation, videoCallLink, setVideoCallLink, agenda, setAgenda, resetForm };
}

function useTeamMembers(teamId: number, selectAll: (ids: number[]) => void) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  useEffect(() => {
    listTeamMembers(teamId).then((data) => {
      setMembers(data);
      selectAll(data.map((member) => member.id));
    });
  }, [teamId, selectAll]);
  return members;
}

function validateRequiredFields(title: string, date: string): CreateMeetingFieldErrors {
  const errors: CreateMeetingFieldErrors = {};
  if (!title.trim()) {
    errors.title = "Enter a title.";
  }
  if (!date.trim()) {
    errors.date = "Select a date and time.";
  }
  return errors;
}

function clearSingleFieldError(
  setFieldErrors: React.Dispatch<React.SetStateAction<CreateMeetingFieldErrors>>,
  key: keyof CreateMeetingFieldErrors,
  value: string,
) {
  if (!value.trim()) {
    return;
  }
  setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
}

async function handleCreateMeetingSubmit(
  event: React.FormEvent,
  model: CreateMeetingModel,
) {
  event.preventDefault();
  const errors = validateRequiredFields(model.fieldState.title, model.fieldState.date);
  if (Object.keys(errors).length > 0) {
    model.setFieldErrors(errors);
    return;
  }

  model.setStatus("loading");
  const result = await submitCreateMeeting({
    teamId: model.teamId,
    userId: model.userId,
    title: model.fieldState.title,
    date: model.fieldState.date,
    subject: model.fieldState.subject,
    location: model.fieldState.location,
    videoCallLink: model.fieldState.videoCallLink,
    agenda: model.fieldState.agenda,
    inviteAll: model.inviteAll,
    selectedIds: Array.from(model.selectedIds),
  });
  applySubmitResult(model, result);
}

function applySubmitResult(
  model: CreateMeetingModel,
  result: Awaited<ReturnType<typeof submitCreateMeeting>>,
) {
  model.setStatus(result.status);
  model.setMessage(result.message);
  model.setFieldErrors(result.fieldErrors);
  if (result.success) {
    model.fieldState.resetForm();
    model.onCreated();
  }
}

function MeetingTitleField(props: {
  value: string;
  error?: string;
  setValue: (value: string) => void;
  setFieldErrors: React.Dispatch<React.SetStateAction<CreateMeetingFieldErrors>>;
}) {
  return (
    <label className="stack" htmlFor="create-meeting-title">
      <span>Title *</span>
      {props.error ? <p className="ui-note ui-note--error">{props.error}</p> : null}
      <input
        id="create-meeting-title"
        type="text"
        value={props.value}
        aria-invalid={props.error ? true : undefined}
        onChange={(event) => {
          props.setValue(event.target.value);
          clearSingleFieldError(props.setFieldErrors, "title", event.target.value);
        }}
      />
    </label>
  );
}

function MeetingDateField(props: {
  value: string;
  error?: string;
  setValue: (value: string) => void;
  setFieldErrors: React.Dispatch<React.SetStateAction<CreateMeetingFieldErrors>>;
}) {
  return (
    <label className="stack" htmlFor="create-meeting-date">
      <span>Date *</span>
      {props.error ? <p className="ui-note ui-note--error">{props.error}</p> : null}
      <input
        id="create-meeting-date"
        type="datetime-local"
        value={props.value}
        aria-invalid={props.error ? true : undefined}
        onChange={(event) => {
          props.setValue(event.target.value);
          clearSingleFieldError(props.setFieldErrors, "date", event.target.value);
        }}
      />
    </label>
  );
}

type MeetingOptionalFieldsProps = {
  subject: string;
  setSubject: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  videoCallLink: string;
  setVideoCallLink: (value: string) => void;
  agenda: string;
  setAgenda: (value: string) => void;
};

function MeetingOptionalFields(props: MeetingOptionalFieldsProps) {
  return (
    <>
      <label className="stack" htmlFor="create-meeting-subject">
        <span>Subject</span>
        <input id="create-meeting-subject" type="text" value={props.subject} onChange={(event) => props.setSubject(event.target.value)} />
      </label>
      <label className="stack" htmlFor="create-meeting-location">
        <span>Location</span>
        <input id="create-meeting-location" type="text" value={props.location} onChange={(event) => props.setLocation(event.target.value)} />
      </label>
      <label className="stack" htmlFor="create-meeting-video-link">
        <span>Video call link</span>
        <input id="create-meeting-video-link" type="url" value={props.videoCallLink} onChange={(event) => props.setVideoCallLink(event.target.value)} placeholder="https://meet.google.com/..." />
      </label>
      <div className="stack">
        <span>Agenda</span>
        <RichTextEditor initialContent={props.agenda} onChange={props.setAgenda} placeholder="Outline the meeting agenda..." />
      </div>
    </>
  );
}

function MeetingParticipantsField(props: {
  members: TeamMember[];
  inviteAll: boolean;
  setInviteAll: (value: boolean) => void;
  selectedIds: Set<number>;
  toggleParticipant: (id: number) => void;
}) {
  if (props.members.length === 0) {
    return null;
  }

  return (
    <div className="stack">
      <span>Participants</span>
      <label className="meeting-form__participant-item">
        <input type="checkbox" checked={props.inviteAll} onChange={(event) => props.setInviteAll(event.target.checked)} />
        Invite all team members
      </label>
      {!props.inviteAll ? (
        <div className="meeting-form__participant-list">
          {props.members.map((member) => (
            <label key={member.id} className="meeting-form__participant-item">
              <input type="checkbox" checked={props.selectedIds.has(member.id)} onChange={() => props.toggleParticipant(member.id)} />
              {member.firstName} {member.lastName}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MeetingFormActions(props: {
  status: CreateMeetingStatus;
  hasUser: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="ui-row">
      <Button type="button" variant="ghost" onClick={props.onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={props.status === "loading" || !props.hasUser}>
        {props.status === "loading" ? "Creating..." : "Create Meeting"}
      </Button>
    </div>
  );
}

type CreateMeetingFormBodyProps = {
  members: TeamMember[];
  inviteAll: boolean;
  setInviteAll: (value: boolean) => void;
  selectedIds: Set<number>;
  toggleParticipant: (id: number) => void;
  fieldState: MeetingFieldState;
  fieldErrors: CreateMeetingFieldErrors;
  setFieldErrors: React.Dispatch<React.SetStateAction<CreateMeetingFieldErrors>>;
  status: CreateMeetingStatus;
  message: string | null;
  hasUser: boolean;
  onCancel: () => void;
};

function CreateMeetingFormBody(props: CreateMeetingFormBodyProps) {
  return (
    <>
      <MeetingTitleField value={props.fieldState.title} error={props.fieldErrors.title} setValue={props.fieldState.setTitle} setFieldErrors={props.setFieldErrors} />
      <MeetingDateField value={props.fieldState.date} error={props.fieldErrors.date} setValue={props.fieldState.setDate} setFieldErrors={props.setFieldErrors} />
      <MeetingOptionalFields subject={props.fieldState.subject} setSubject={props.fieldState.setSubject} location={props.fieldState.location} setLocation={props.fieldState.setLocation} videoCallLink={props.fieldState.videoCallLink} setVideoCallLink={props.fieldState.setVideoCallLink} agenda={props.fieldState.agenda} setAgenda={props.fieldState.setAgenda} />
      <MeetingParticipantsField members={props.members} inviteAll={props.inviteAll} setInviteAll={props.setInviteAll} selectedIds={props.selectedIds} toggleParticipant={props.toggleParticipant} />
      <MeetingFormActions status={props.status} hasUser={props.hasUser} onCancel={props.onCancel} />
      {props.message ? <p className={props.status === "error" ? "error" : "muted"}>{props.message}</p> : null}
    </>
  );
}

export function CreateMeetingForm({ teamId, onCreated, onCancel }: CreateMeetingFormProps) {
  const { user } = useUser();
  const fieldState = useMeetingFieldState();
  const [fieldErrors, setFieldErrors] = useState<CreateMeetingFieldErrors>({});
  const [status, setStatus] = useState<CreateMeetingStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const { inviteAll, setInviteAll, selectedIds, toggleParticipant, selectAll } =
    useParticipantSelection({ initialSelectedIds: [], initialInviteAll: true });
  const members = useTeamMembers(teamId, selectAll);

  const model: CreateMeetingModel = {
    teamId,
    onCreated,
    userId: user?.id ?? null,
    fieldState,
    inviteAll,
    selectedIds,
    fieldErrors,
    setFieldErrors,
    setStatus,
    setMessage,
  };

  return (
    <Card title="New Meeting">
      <form className="stack" onSubmit={(event) => handleCreateMeetingSubmit(event, model)}>
        <CreateMeetingFormBody members={members} inviteAll={inviteAll} setInviteAll={setInviteAll} selectedIds={selectedIds} toggleParticipant={toggleParticipant} fieldState={fieldState} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} status={status} message={message} hasUser={Boolean(user)} onCancel={onCancel} />
      </form>
    </Card>
  );
}
