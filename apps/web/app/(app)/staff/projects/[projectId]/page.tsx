import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getCurrentUser } from "@/shared/auth/session";
import { StaffTeamCard } from "@/features/staff/projects/components/StaffTeamCard";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectTeamsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectTeamsPage({ params }: StaffProjectTeamsPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const userId = (await getCurrentUser())!.id;
  const data = await getStaffProjectTeams(userId, numericProjectId);

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
