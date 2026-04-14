import Link from "next/link";
import { getMeeting } from "@/features/meetings/api/client";
import { StaffMeetingCommentsReadOnly } from "@/features/staff/meetings/components/StaffMeetingCommentsReadOnly";
import { StaffSingleMeetingAttendanceStats } from "@/features/staff/meetings/components/StaffSingleMeetingAttendanceStats";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getCurrentUser } from "@/shared/auth/session";
import { Card } from "@/shared/ui/Card";
import { RichTextViewer } from "@/shared/ui/rich-text/RichTextViewer";
import "@/features/staff/meetings/styles/staff-meetings.css";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string; meetingId: string }>;
};

function parseIds(projectId: string, teamId: string, meetingId: string) {
  const pid = Number(projectId);
  const tid = Number(teamId);
  const mid = Number(meetingId);
  if (!Number.isFinite(pid) || !Number.isFinite(tid) || !Number.isFinite(mid)) {
    return null;
  }
  return { projectId: pid, teamId: tid, meetingId: mid };
}

async function loadProjectTeam(userId: number, projectId: number, teamId: number) {
  try {
    const projectData = await getStaffProjectTeams(userId, projectId);
    const team = projectData.teams.find((item) => item.id === teamId) ?? null;
    return { team, error: team ? null : "Team not found in this project." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load project team data.";
    return { team: null, error: message };
  }
}

function TeamMessage({ message }: { message: string }) {
  return (
    <div className="stack">
      <p className="muted">{message}</p>
    </div>
  );
}

export default async function StaffMeetingMinutesPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    return <TeamMessage message="You must be signed in to view meeting minutes." />;
  }

  const { projectId: projectIdParam, teamId: teamIdParam, meetingId: meetingIdParam } = await params;
  const parsed = parseIds(projectIdParam, teamIdParam, meetingIdParam);
  if (!parsed) {
    return <TeamMessage message="Invalid project, team, or meeting ID." />;
  }

  const { projectId, teamId, meetingId } = parsed;
  const encProject = encodeURIComponent(String(projectId));
  const encTeam = encodeURIComponent(String(teamId));
  const backHref = `/staff/projects/${encProject}/teams/${encTeam}/team-meetings`;

  const project = await loadProjectTeam(user.id, projectId, teamId);
  if (!project.team) {
    return <TeamMessage message={project.error ?? "Team not found in this project."} />;
  }

  let meeting: Awaited<ReturnType<typeof getMeeting>> | null = null;
  try {
    meeting = await getMeeting(meetingId);
  } catch {
    meeting = null;
  }

  if (!meeting || meeting.teamId !== teamId) {
    return <TeamMessage message="Meeting not found for this team." />;
  }

  const dateLabel = new Date(meeting.date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <Link href={backHref} className="ui-link">
          ← Back to team meetings
        </Link>
      </div>
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="staff-projects__card-title" style={{ margin: 0 }}>
          {meeting.title}
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          {dateLabel}
          {" · "}
          Organiser: {meeting.organiser.firstName} {meeting.organiser.lastName}
        </p>
      </header>
      <Card title="Attendance">
        <StaffSingleMeetingAttendanceStats attendances={meeting.attendances} />
      </Card>
      <Card title="Minutes">
        {meeting.minutes ? (
          <RichTextViewer content={meeting.minutes.content} />
        ) : (
          <p className="muted">No minutes have been recorded for this meeting.</p>
        )}
      </Card>
      <StaffMeetingCommentsReadOnly comments={meeting.comments ?? []} />
    </div>
  );
}
