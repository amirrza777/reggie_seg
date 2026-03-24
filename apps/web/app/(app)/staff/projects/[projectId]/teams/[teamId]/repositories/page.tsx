import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import { StaffProjectReposReadOnlyClient } from "@/features/github/components/StaffProjectReposReadOnlyClient";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffRepositoriesSectionPage({ params }: PageProps) {
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

  let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load repositories.";
  }

  const team = data?.teams.find((item) => item.id === numericTeamId) ?? null;
  if (!data || !team) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Team not found in this project."}</p>
      </div>
    );
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Repositories</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Project: {data.project.name}. Review repository activity and contribution evidence for this team context.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">Project {data.project.id}</span>
          <span className="staff-projects__badge">Team {team.id}</span>
          <Link href={`/staff/projects/${data.project.id}/teams/${team.id}`} className="staff-projects__badge">
            Back to team overview
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <StaffProjectReposReadOnlyClient
        projectId={projectId}
        projectName={data.project.name}
        teamName={team.teamName}
      />
    </div>
  );
}
