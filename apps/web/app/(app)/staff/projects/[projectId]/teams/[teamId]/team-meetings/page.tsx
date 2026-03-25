import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import { listTeamMeetings, getTeamMeetingSettings } from "@/features/staff/meetings/api/client";
import { StaffMeetingsView } from "@/features/staff/meetings/StaffMeetingsView";
import "@/features/staff/meetings/styles/staff-meetings.css";
import "@/features/staff/projects/styles/staff-projects.css";
import Link from "next/link";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTeamMeetingsSectionPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId, teamId } = await params;
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);

  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let projectData: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let projectError: string | null = null;
  try {
    projectData = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    projectError = error instanceof Error ? error.message : "Failed to load project team data.";
  }

  const team = projectData?.teams.find((item) => item.id === numericTeamId) ?? null;
  if (!projectData || !team) {
    return (
      <div className="stack">
        <p className="muted">{projectError ?? "Team not found in this project."}</p>
        <Link href={`/staff/projects/${projectId}`} className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to project teams
        </Link>
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
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Team Meetings</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Project: {projectData.project.name}. Review meeting cadence, attendance trends, and recorded minutes.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">Project {projectData.project.id}</span>
          <span className="staff-projects__badge">Team {team.id}</span>
          <Link href={`/staff/projects/${projectData.project.id}/teams/${team.id}`} className="staff-projects__badge">
            Back to team overview
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <section className="staff-projects__team-card" aria-label="Team meetings analytics and history">
        {meetingsError ? <p className="muted">{meetingsError}</p> : <StaffMeetingsView meetings={meetings} absenceThreshold={absenceThreshold} />}
      </section>
    </div>
  );
}
