import Link from "next/link";
import { redirect } from "next/navigation";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";
import { getCurrentUser } from "@/shared/auth/session";
import { StaffTeamCard } from "@/features/staff/projects/components/StaffTeamCard";
import { StaffProjectWarningsConfigPanel } from "@/features/staff/projects/components/StaffProjectWarningsConfigPanel";
import { StaffProjectSectionNav } from "@/features/staff/projects/components/StaffProjectSectionNav";
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
  const loadResult = await loadStaffProjectTeamsForPage(user.id, projectId, "Failed to load project teams.");
  if (loadResult.status === "invalid_project_id") {
    return <p className="muted">Invalid project ID.</p>;
  }
  if (loadResult.status === "error") {
    return (
      <div className="stack">
        <p className="muted">{loadResult.message}</p>
      </div>
    );
  }
  const { data } = loadResult;

  const totalStudents = data.teams.reduce((sum, team) => sum + team.allocations.length, 0);

  return (
    <div className="staff-projects">
      <StaffProjectSectionNav projectId={projectId} moduleId={data.project.moduleId} />

      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Project</p>
        <h1 className="staff-projects__title">{data.project.name}</h1>
        <p className="staff-projects__desc">
          Module: {data.project.moduleName}. Choose a team to inspect assessment progress, feedback evidence, repositories, and grading.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">{data.teams.length} team{data.teams.length === 1 ? "" : "s"}</span>
          <span className="staff-projects__badge">{totalStudents} student{totalStudents === 1 ? "" : "s"}</span>
        </div>
        <div className="staff-projects__hero-actions">
          <div className="staff-projects__hero-actions-links">
            <Link href={`/staff/projects/${data.project.id}/team-allocation`} className="staff-projects__quick-link">
              Team allocation
            </Link>
            <Link href={`/staff/projects/${data.project.id}/discussion`} className="staff-projects__quick-link">
              Forum
            </Link>
            <Link href={`/staff/projects/${data.project.id}/feature-flags`} className="staff-projects__quick-link">
              Feature flags
            </Link>
            <Link href={`/staff/projects/${data.project.id}/warnings`} className="staff-projects__quick-link">
              Warnings
            </Link>
          </div>

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
