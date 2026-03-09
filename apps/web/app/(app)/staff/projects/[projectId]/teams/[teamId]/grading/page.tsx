import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffMarkingCard } from "@/features/staff/peerAssessments/components/StaffMarkingCard";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTeamGradingSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;

  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

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

  let teamMarking: Awaited<ReturnType<typeof getTeamDetails>>["teamMarking"] = null;
  let gradingError: string | null = null;
  try {
    const teamDetails = await getTeamDetails(user.id, projectData.project.moduleId, numericTeamId);
    teamMarking = teamDetails.teamMarking;
  } catch (error) {
    gradingError = error instanceof Error ? error.message : "Failed to load team grading details.";
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Grading</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Project: {projectData.project.name}. Manage team-level grading and formative feedback.
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

      {gradingError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>{gradingError}</p>
        </section>
      ) : (
        <StaffMarkingCard
          title="Team marking and formative feedback"
          description="Set a shared team mark and formative guidance visible to all team members."
          staffId={user.id}
          moduleId={projectData.project.moduleId}
          teamId={team.id}
          initialMarking={teamMarking}
        />
      )}
    </div>
  );
}
