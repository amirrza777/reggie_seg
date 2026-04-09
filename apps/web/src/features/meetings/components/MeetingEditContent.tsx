"use client";

import { ChevronLeft } from "lucide-react";
import { useUser } from "@/features/auth/context";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { isMeetingMember } from "../lib/meetingMember";
import { useMeetingWithSettings } from "../hooks/useMeetingWithSettings";
import { MeetingEditForm } from "./MeetingEditForm";
import "../styles/meeting-detail.css";

type MeetingEditContentProps = {
  meetingId: number;
  projectId: number;
};

export function MeetingEditContent({ meetingId, projectId }: MeetingEditContentProps) {
  const { user } = useUser();
  const { canEdit: workspaceCanEdit } = useProjectWorkspaceCanEdit();
  const { meeting, settings } = useMeetingWithSettings(meetingId);

  if (!meeting || !user || !settings) return null;

  const backLink = (
    <AnchorLink href={`/projects/${projectId}/meetings/${meetingId}`} className="back-link">
      <ChevronLeft size={14} />
      Back to meeting
    </AnchorLink>
  );

  if (!workspaceCanEdit) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">This project is archived; meetings cannot be edited.</p>
      </div>
    );
  }

  const isOrganiser = meeting.organiserId === user.id;
  const isMember = isMeetingMember(meeting.team.allocations, user.id);
  const canEdit = isOrganiser || (settings.allowAnyoneToEditMeetings && isMember);

  if (!canEdit) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">You don't have permission to edit this meeting.</p>
      </div>
    );
  }

  if (new Date(meeting.date) < new Date()) {
    return (
      <div className="stack">
        {backLink}
        <p className="muted">Meeting details cannot be edited once the meeting has started.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {backLink}
      <MeetingEditForm meeting={meeting} userId={user.id} projectId={projectId} />
    </div>
  );
}
