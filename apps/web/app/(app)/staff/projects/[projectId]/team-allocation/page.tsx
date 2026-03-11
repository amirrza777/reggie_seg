import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { StaffRandomAllocationPreview } from "@/features/staff/projects/components/StaffRandomAllocationPreview";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectAllocationPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectAllocationPage({ params }: StaffProjectAllocationPageProps) {
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
    errorMessage = error instanceof Error ? error.message : "Failed to load project team allocation data.";
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
  const emptyTeams = data.teams.filter((team) => team.allocations.length === 0).length;

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Team allocation</p>
        <h1 className="staff-projects__title">{data.project.name}</h1>
        <p className="staff-projects__desc">
          Module: {data.project.moduleName}. Review current team distribution and prepare random allocation for this project.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">{data.teams.length} team{data.teams.length === 1 ? "" : "s"}</span>
          <span className="staff-projects__badge">{totalStudents} allocated student{totalStudents === 1 ? "" : "s"}</span>
          <span className="staff-projects__badge">{emptyTeams} empty team{emptyTeams === 1 ? "" : "s"}</span>
          <Link href={`/staff/projects/${data.project.id}`} className="staff-projects__badge">
            Back to teams
          </Link>
        </div>
      </section>

      <section className="staff-projects__team-card" aria-label="Current team distribution">
        <h2 className="staff-projects__card-title">Current team distribution</h2>
        <p className="staff-projects__card-sub">
          Use this snapshot before running allocation.
        </p>
      </section>

      <StaffRandomAllocationPreview projectId={data.project.id} initialTeamCount={Math.max(1, data.teams.length)} />

      <section className="staff-projects__team-list" aria-label="Project teams">
        {data.teams.map((team) => (
          <article key={team.id} className="staff-projects__team-card">
            <div className="staff-projects__team-top">
              <h3 className="staff-projects__team-title">{team.teamName}</h3>
              <span className="staff-projects__badge">
                {team.allocations.length} member{team.allocations.length === 1 ? "" : "s"}
              </span>
            </div>
            <Link href={`/staff/projects/${data.project.id}/teams/${team.id}`} className="pill-nav__link staff-projects__team-action">
              Open team workspace
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}