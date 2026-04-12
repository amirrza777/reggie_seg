import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { listTeamMeetings, getTeamMeetingSettings } from "@/features/staff/meetings/api/client";
import { StaffMeetingsView } from "@/features/staff/meetings/components/StaffMeetingsView";
import "@/features/staff/meetings/styles/staff-meetings.css";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

type ParsedRouteParams = {
  projectId: number;
  teamId: number;
};

type TeamMeetingsState = {
  meetings: Awaited<ReturnType<typeof listTeamMeetings>>;
  absenceThreshold: number;
  error: string | null;
};

function parseRouteParams(projectId: string, teamId: string): ParsedRouteParams | null {
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return null;
  }
  return { projectId: numericProjectId, teamId: numericTeamId };
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

async function loadTeamMeetings(teamId: number): Promise<TeamMeetingsState> {
  try {
    const [meetings, settings] = await Promise.all([
      listTeamMeetings(teamId),
      getTeamMeetingSettings(teamId),
    ]);
    return { meetings, absenceThreshold: settings.absenceThreshold, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load meetings.";
    return { meetings: [], absenceThreshold: 3, error: message };
  }
}

function TeamMessage({ message }: { message: string }) {
  return (
    <div className="stack">
      <p className="muted">{message}</p>
    </div>
  );
}

export default async function StaffTeamMeetingsSectionPage({ params }: PageProps) {
  const userId = (await getCurrentUser())!.id;
  const routeParams = await params;
  const parsed = parseRouteParams(routeParams.projectId, routeParams.teamId);
  if (!parsed) {
    return <TeamMessage message="Invalid project or team ID." />;
  }

  const project = await loadProjectTeam(userId, parsed.projectId, parsed.teamId);
  if (!project.team) {
    return <TeamMessage message={project.error ?? "Team not found in this project."} />;
  }

  const meetingsState = await loadTeamMeetings(parsed.teamId);
  const count = meetingsState.meetings.length;
  return (
    <>
      <section className="staff-projects__team-card" aria-label="Team meetings analytics and history">
        {meetingsState.error ? (
          <p className="muted">{meetingsState.error}</p>
        ) : (
          <StaffMeetingsView meetings={meetingsState.meetings} absenceThreshold={meetingsState.absenceThreshold} />
        )}
      </section>
    </>
  );
}
