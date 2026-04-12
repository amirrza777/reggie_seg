"use client";

import { useUser } from "@/features/auth/context";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { isMeetingMember } from "../../lib/meetingMember";
import { daysToMs } from "../../lib/meetingTime";
import { useMeetingWithSettings } from "../../hooks/useMeetingWithSettings";
import { MeetingBreadcrumbs } from "../MeetingBreadcrumbs";
import { MeetingMinutes } from "./MeetingMinutes";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
import { Card } from "@/shared/ui/Card";
import "../../styles/meeting-detail.css";

type MeetingMinutesContentProps = {
  meetingId: number;
  projectId: number;
};

export function MeetingMinutesContent({ meetingId, projectId }: MeetingMinutesContentProps) {
  const { user } = useUser();
  const { canEdit: workspaceCanEdit } = useProjectWorkspaceCanEdit();
  const { meeting, settings } = useMeetingWithSettings(meetingId);

  if (!meeting || !user || !settings) return null;

  const meetingDate = new Date(meeting.date);
  const now = new Date();
  const isUpcomingMeeting = meetingDate > now;
  const meetingsHref = `/projects/${projectId}/meetings?tab=${isUpcomingMeeting ? "upcoming" : "previous"}`;

  if (!workspaceCanEdit) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Minutes" />
        <Card title="Minutes">
          <p className="muted">This project is archived; minutes are read-only.</p>
          {meeting.minutes ? <RichTextViewer content={meeting.minutes.content} /> : <p className="muted">No minutes recorded.</p>}
        </Card>
      </div>
    );
  }

  const isMember = isMeetingMember(meeting.team.allocations, user.id);
  const isOriginalWriter = meeting.minutes?.writerId === user.id;
  const canWriteMinutes = !meeting.minutes
    || isOriginalWriter
    || (settings.allowAnyoneToWriteMinutes && isMember);
  const editWindowMs = daysToMs(settings.minutesEditWindowDays);

  if (isUpcomingMeeting) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Minutes" />
        <p className="muted">Minutes cannot be written until the meeting has started.</p>
      </div>
    );
  }

  if (now.getTime() - meetingDate.getTime() > editWindowMs) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Minutes" />
        <Card title="Minutes">
          <p className="muted">The edit window for these minutes has closed.</p>
          {meeting.minutes && <RichTextViewer content={meeting.minutes.content} />}
        </Card>
      </div>
    );
  }

  if (!canWriteMinutes) {
    return (
      <div className="stack">
        <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Minutes" />
        <Card title="Minutes">
          <p className="muted">Only the original writer can edit these minutes.</p>
          {meeting.minutes && <RichTextViewer content={meeting.minutes.content} />}
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      <MeetingBreadcrumbs projectId={projectId} meetingId={meetingId} meetingsHref={meetingsHref} currentLabel="Minutes" />
      <Card title="Minutes">
        <MeetingMinutes
          meetingId={meeting.id}
          writerId={user.id}
          initialContent={meeting.minutes?.content ?? ""}
        />
      </Card>
    </div>
  );
}
