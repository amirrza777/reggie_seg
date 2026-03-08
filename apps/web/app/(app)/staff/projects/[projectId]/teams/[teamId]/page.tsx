import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { Placeholder } from "@/shared/ui/Placeholder";

type StaffProjectTeamTabsPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffProjectTeamTabsPage({ params }: StaffProjectTeamTabsPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId, teamId } = await params;
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
    errorMessage = error instanceof Error ? error.message : "Failed to load team data.";
  }

  const team = data?.teams.find((item) => item.id === numericTeamId);

  if (!data || !team) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Team not found in this project."}</p>
        <Link href={`/staff/projects/${projectId}`} className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to project teams
        </Link>
      </div>
    );
  }

  return (
    <div className="stack stack--loose">
      <Placeholder
        title={`${data.project.name} — ${team.teamName}`}
        description="Use these team tabs to move into staff workflows for this team."
      />

      <nav className="pill-nav" aria-label="Team tabs">
        <Link href={`/staff/peer-assessments/module/${data.project.moduleId}/team/${team.id}`} className="pill-nav__link pill-nav__link--active">
          Peer assessments
        </Link>
        <Link href={`/staff/repos?projectId=${data.project.id}`} className="pill-nav__link">
          Repository insights
        </Link>
        <Link href={`/staff/integrations?projectId=${data.project.id}`} className="pill-nav__link">
          Integrations
        </Link>
      </nav>

      <section className="card stack" aria-label="Team members" style={{ gap: 10 }}>
        <h3 style={{ margin: 0 }}>Team Members</h3>
        {team.allocations.length === 0 ? <p className="muted" style={{ margin: 0 }}>No students assigned yet.</p> : null}
        {team.allocations.map((allocation) => (
          <p key={allocation.userId} style={{ margin: 0 }}>
            {allocation.user.firstName} {allocation.user.lastName}
            <span className="muted"> ({allocation.user.email})</span>
          </p>
        ))}
      </section>
    </div>
  );
}
