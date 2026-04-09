import Link from "next/link";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectMeetingsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectMeetingsPage({ params }: StaffProjectMeetingsPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const userId = (await getCurrentUser())!.id;
  const data = await getStaffProjectTeams(userId, numericProjectId);

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
