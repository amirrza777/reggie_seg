import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { listTeamMeetings, getTeamMeetingSettings } from "@/features/staff/meetings/api/client";
import { StaffMeetingsView } from "@/features/staff/meetings/StaffMeetingsView";
import "@/features/staff/meetings/styles/staff-meetings.css";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTeamMeetingsSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const userId = (await getCurrentUser())!.id;
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);

  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let projectData: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let projectError: string | null = null;
  try {
    projectData = await getStaffProjectTeams(userId, numericProjectId);
  } catch (error) {
    projectError = error instanceof Error ? error.message : "Failed to load project team data.";
  }

  const team = projectData?.teams.find((item) => item.id === numericTeamId) ?? null;
  if (!projectData || !team) {
    return (
      <div className="stack">
        <p className="muted">{projectError ?? "Team not found in this project."}</p>
      </div>
    );
  }

  let meetings: Awaited<ReturnType<typeof listTeamMeetings>> = [];
  let meetingsError: string | null = null;
  let absenceThreshold = 3;

  try {
    [meetings, { absenceThreshold }] = await Promise.all([
      listTeamMeetings(numericTeamId),
      getTeamMeetingSettings(numericTeamId),
    ]);
  } catch (error) {
    meetingsError = error instanceof Error ? error.message : "Failed to load meetings.";
  }

  return (
    <>
      <p className="muted">
        Team: {team.teamName} · {meetings.length} meeting{meetings.length === 1 ? "" : "s"} logged
      </p>

    <section className="staff-projects__team-card" aria-label="Team meetings analytics and history">
      {meetingsError ? <p className="muted">{meetingsError}</p> : <StaffMeetingsView meetings={meetings} absenceThreshold={absenceThreshold} />}
    </section>
    </>
  );
}
