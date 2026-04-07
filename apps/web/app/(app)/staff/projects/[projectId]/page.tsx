import Link from "next/link";
import { redirect } from "next/navigation";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";
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

  return (
    <>
      {data.teams.length === 0 ? <p className="muted">No teams exist in this project yet.</p> : null}
      <section className="staff-projects__team-list" aria-label="Project teams">
        {data.teams.map((team) => (
          <StaffTeamCard key={team.id} team={team} projectId={data.project.id} />
        ))}
      </section>
    </>
  );
}
