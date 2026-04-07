import Link from "next/link";
import { redirect } from "next/navigation";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectMeetingsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectMeetingsPage({ params }: StaffProjectMeetingsPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId } = await params;
  const loadResult = await loadStaffProjectTeamsForPage(user.id, projectId, "Failed to load project meetings.");
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

  return (
    <>
      {data.teams.length === 0 ? <p className="muted">No teams exist in this project yet.</p> : null}

      <section className="staff-projects__team-list" aria-label="Team meetings">
        {data.teams.map((team) => (
          <article key={team.id} className="staff-projects__team-card">
            <h2 className="staff-projects__card-title">{team.teamName}</h2>
            <p className="staff-projects__card-sub">
              {team.allocations.length} member{team.allocations.length === 1 ? "" : "s"}
            </p>
            <Link
              href={`/staff/projects/${data.project.id}/teams/${team.id}/team-meetings`}
              className="staff-projects__quick-link"
            >
              Open team meetings
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
