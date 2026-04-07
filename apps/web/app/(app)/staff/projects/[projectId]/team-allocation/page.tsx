import Link from "next/link";
import { redirect } from "next/navigation";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";
import { getCurrentUser } from "@/shared/auth/session";
import { StaffAllocationModesPanel } from "@/features/staff/projects/components/StaffAllocationModesPanel";
import { StaffAllocationDraftsPanel } from "@/features/staff/projects/components/StaffAllocationDraftsPanel";
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
  const loadResult = await loadStaffProjectTeamsForPage(
    user.id,
    projectId,
    "Failed to load project team allocation data."
  );
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
  const emptyTeams = data.teams.filter((team) => team.allocations.length === 0).length;

  return (
    <>
      <p className="muted">
        {emptyTeams} empty team{emptyTeams === 1 ? "" : "s"}
      </p>

      <StaffAllocationModesPanel
        projectId={data.project.id}
        initialTeamCount={Math.max(1, data.teams.length)}
      />

      <StaffAllocationDraftsPanel projectId={data.project.id} />

      <section className="staff-projects__team-card staff-projects__allocation-methods" aria-label="Project teams">
        <h2 className="staff-projects__card-title">Active Teams</h2>
        <p className="staff-projects__allocation-note">
          Draft teams are managed in the Allocation Drafts panel and appear here only after owner approval.
        </p>
        <section className="staff-projects__team-list" aria-label="Project teams list">
          {data.teams.map((team) => (
            <article key={team.id} className="staff-projects__team-card">
              <div className="staff-projects__team-top">
                <h3 className="staff-projects__team-title">{team.teamName}</h3>
                <span className="staff-projects__badge">
                  {team.allocations.length} member{team.allocations.length === 1 ? "" : "s"}
                </span>
              </div>
              <Link
                href={`/staff/modules/${encodeURIComponent(String(data.project.moduleId))}/projects/${data.project.id}/teams/${team.id}`}
                className="pill-nav__link staff-projects__team-action"
              >
                Open team workspace
              </Link>
            </article>
          ))}
        </section>
      </section>
    </>
  );
}
