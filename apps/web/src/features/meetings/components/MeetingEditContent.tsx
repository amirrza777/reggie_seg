"use client";

import { useUser } from "@/features/auth/context";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { isMeetingMember } from "../lib/meetingMember";
import { useMeetingWithSettings } from "../hooks/useMeetingWithSettings";
import { MeetingBreadcrumbs } from "./MeetingBreadcrumbs";
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

  const isUpcomingMeeting = new Date(meeting.date) > new Date();
  const meetingsHref = `/projects/${projectId}/meetings?tab=${isUpcomingMeeting ? "upcoming" : "previous"}`;

  if (!workspaceCanEdit) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Edit meeting" />
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
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Edit meeting" />
        <p className="muted">You don't have permission to edit this meeting.</p>
      </div>
    );
  }

  if (!isUpcomingMeeting) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Edit meeting" />
        <p className="muted">Meeting details cannot be edited once the meeting has started.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Edit meeting" />
      <MeetingEditForm meeting={meeting} userId={user.id} projectId={projectId} />
    </div>
  );
}
