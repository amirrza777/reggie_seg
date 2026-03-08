import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { Placeholder } from "@/shared/ui/Placeholder";

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
    data = await getStaffProjectTeams(numericProjectId);
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

  return (
    <div className="stack stack--loose">
      <Placeholder
        title={data.project.name}
        description={`Module: ${data.project.moduleName}. Select a team to open team-level tabs.`}
      />

      <nav className="pill-nav" aria-label="Project-level actions">
        <Link href={`/staff/repos?projectId=${data.project.id}`} className="pill-nav__link">
          Repository insights
        </Link>
        <Link href={`/staff/integrations?projectId=${data.project.id}`} className="pill-nav__link">
          Integrations
        </Link>
      </nav>

      {data.teams.length === 0 ? <p className="muted">No teams exist in this project yet.</p> : null}
      <section className="stack" aria-label="Project teams">
        {data.teams.map((team) => (
          <article key={team.id} className="card stack" style={{ gap: 8 }}>
            <h3 style={{ margin: 0 }}>{team.teamName}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {team.allocations.length} member{team.allocations.length === 1 ? "" : "s"}
            </p>
            <div>
              <Link href={`/staff/projects/${data.project.id}/teams/${team.id}`} className="pill-nav__link pill-nav__link--active">
                Open team tabs
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
