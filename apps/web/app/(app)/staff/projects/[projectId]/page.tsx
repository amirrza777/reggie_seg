import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { StaffTeamCard } from "@/features/staff/projects/components/StaffTeamCard";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectTeamsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectTeamsPage({ params }: StaffProjectTeamsPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  if (Number.isNaN(numericProjectId)) {
    return <p className="muted">Invalid project ID.</p>;
  }

  let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load project teams.";
  }

  if (!data) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Project not found."}</p>
        <Link href="/staff/projects" className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to staff projects
        </Link>
      </div>
    );
  }

  const totalStudents = data.teams.reduce((sum, team) => sum + team.allocations.length, 0);

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Project</p>
        <h1 className="staff-projects__title">{data.project.name}</h1>
        <p className="staff-projects__desc">
          Module: {data.project.moduleName}. Choose a team to inspect assessment progress, feedback evidence, repositories, and grading.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">{data.teams.length} team{data.teams.length === 1 ? "" : "s"}</span>
          <span className="staff-projects__badge">{totalStudents} student{totalStudents === 1 ? "" : "s"}</span>
          <Link href="/staff/projects" className="staff-projects__badge">Back to projects</Link>
        </div>
        <div className="staff-projects__hero-actions">
          <Link href={`/staff/projects/${data.project.id}/team-allocation`} className="staff-projects__quick-link">
            Team allocation
          </Link>
          <Link href={`/staff/projects/${data.project.id}/discussion`} className="staff-projects__quick-link">
            Forum
          </Link>
        </div>
      </section>


      {data.teams.length === 0 ? <p className="muted">No teams exist in this project yet.</p> : null}
      <section className="staff-projects__team-list" aria-label="Project teams">
        {data.teams.map((team) => (
          <StaffTeamCard key={team.id} team={team} projectId={data.project.id} />
        ))}
      </section>
    </div>
  );
}
