"use client";

import { Pencil, UserCheck, NotebookPen } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import { AnchorLink } from "@/shared/ui/AnchorLink";
import { useUser } from "@/features/auth/useUser";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { CommentSection } from "../CommentSection";
import { AddToCalendarDropdown } from "../AddToCalendarDropdown";
import { RichTextViewer } from "@/shared/ui/rich-text/RichTextViewer";
import { getMeetingPermissions } from "../../lib/meetingPermissions";
import { MeetingBreadcrumbs } from "../MeetingBreadcrumbs";
import "../../styles/meeting-detail.css";
import "../../styles/meeting-list.css";
import type { Meeting, MeetingPermissions } from "../../types";

type MeetingDetailProps = {
  meeting: Meeting;
  projectId: number;
  permissions: MeetingPermissions;
};

function formatStatus(status: string) {
  const labels: Record<string, string> = { on_time: "On time", late: "Late", absent: "Absent" };
  return labels[status] ?? status;
}

type MeetingDetailActionsProps = {
  meeting: Meeting;
  projectId: number;
  upcoming: boolean;
  canEdit: boolean;
  canRecordAttendance: boolean;
  canWriteMinutes: boolean;
  minutesWindowOpen: boolean;
  attendanceWindowOpen: boolean;
};

function MeetingDetailActions({
  meeting,
  projectId,
  upcoming,
  canEdit,
  canRecordAttendance,
  canWriteMinutes,
  minutesWindowOpen,
  attendanceWindowOpen,
}: MeetingDetailActionsProps) {
  return (
    <div className="meeting-list__actions">
      {upcoming && <AddToCalendarDropdown meeting={meeting} compact />}
      {canEdit && upcoming && (
        <AnchorLink
          href={`/projects/${projectId}/meetings/${meeting.id}/edit`}
          className="meeting-list__action"
          aria-label="Edit meeting"
          title="Edit meeting"
        >
          <Pencil size={16} />
        </AnchorLink>
      )}
      {canRecordAttendance && !upcoming && attendanceWindowOpen && (
        <AnchorLink
          href={`/projects/${projectId}/meetings/${meeting.id}/attendance`}
          className="meeting-list__action"
          aria-label="Record attendance"
          title="Record attendance"
        >
          <UserCheck size={16} />
        </AnchorLink>
      )}
      {!upcoming && canWriteMinutes && minutesWindowOpen && (
        <AnchorLink
          href={`/projects/${projectId}/meetings/${meeting.id}/minutes`}
          className="meeting-list__action"
          aria-label="Meeting minutes"
          title="Meeting minutes"
        >
          <NotebookPen size={16} />
        </AnchorLink>
      )}
    </div>
  );
}

export function MeetingDetail({ meeting, projectId, permissions }: MeetingDetailProps) {
  const { user } = useUser();
  const { canEdit: workspaceCanEdit } = useProjectWorkspaceCanEdit();
  const members = meeting.team?.allocations?.map((a) => a.user) ?? [];
  const upcoming = new Date(meeting.date) >= new Date();
  const meetingsHref = `/projects/${projectId}/meetings?tab=${upcoming ? "upcoming" : "previous"}`;
  const flags = getMeetingPermissions(meeting, permissions, user?.id ?? null, workspaceCanEdit);

  return (
    <div className="stack">
      <MeetingBreadcrumbs projectId={projectId} meetingsHref={meetingsHref} currentLabel={meeting.title} />

      <Card
        title={meeting.title}
        action={
          <MeetingDetailActions
            meeting={meeting}
            projectId={projectId}
            upcoming={upcoming}
            canEdit={flags.canEditMeeting}
            canRecordAttendance={flags.canRecordAttendance}
            canWriteMinutes={flags.canWriteMinutes}
            minutesWindowOpen={flags.minutesWindowOpen}
            attendanceWindowOpen={flags.attendanceWindowOpen}
          />
        }
      >
        <p>Date: {new Date(meeting.date).toLocaleString()}</p>
        <p>Organiser: {meeting.organiser.firstName} {meeting.organiser.lastName}</p>
        {meeting.subject && <p>Subject: {meeting.subject}</p>}
        {meeting.location && <p>Location: {meeting.location}</p>}
        {meeting.videoCallLink && (
          <p>
            Video call:{" "}
            <a href={meeting.videoCallLink} target="_blank" rel="noopener noreferrer">
              {meeting.videoCallLink}
            </a>
          </p>
        )}
        {meeting.agenda && (
          <div>
            <h3>Agenda</h3>
            <RichTextViewer content={meeting.agenda} />
          </div>
        )}
      </Card>

      {meeting.participants.length > 0 && meeting.attendances.length === 0 && (
        <Card title="Participants">
          <Table
            headers={["Name"]}
            rows={meeting.participants.map((p) => [
              `${p.user.firstName} ${p.user.lastName}`,
            ])}
          />
        </Card>
      )}

      {meeting.attendances.length > 0 && (
        <Card title="Attendance">
          <Table
            headers={["Name", "Status"]}
            rows={meeting.attendances.map((a) => [
              `${a.user.firstName} ${a.user.lastName}`,
              formatStatus(a.status),
            ])}
            className="table table--attendance"
          />
        </Card>
      )}

      {meeting.minutes && (
        <Card title="Minutes">
          <RichTextViewer content={meeting.minutes.content} />
        </Card>
      )}

      <CommentSection
        meetingId={meeting.id}
        teamId={meeting.teamId}
        members={members}
        initialComments={meeting.comments ?? []}
        allowComposer={workspaceCanEdit}
      />
    </div>
  );
}
