import Link from "next/link";
import { GithubProjectReposClient } from "@/features/github/components/GithubProjectReposClient";
import { getStaffProjectTeams, getStaffProjects } from "@/features/projects/api/client";
import { ProjectTrelloContent } from "@/features/trello/components/ProjectTrelloContent";
import { Placeholder } from "@/shared/ui/Placeholder";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";

type StaffIntegrationsPageProps = {
  searchParams: Promise<{ projectId?: string | string[] }>;
};

export default async function StaffIntegrationsPage({ searchParams }: StaffIntegrationsPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const requestedProjectId = Array.isArray(resolvedSearchParams.projectId)
    ? resolvedSearchParams.projectId[0]
    : resolvedSearchParams.projectId;

  let projects: Awaited<ReturnType<typeof getStaffProjects>> = [];
  let projectLoadError: string | null = null;

  try {
    projects = await getStaffProjects();
  } catch (err) {
    projectLoadError = err instanceof Error ? err.message : "Failed to load your projects.";
  }

  const selectedProject =
    projects.find((project) => String(project.id) === String(requestedProjectId)) ?? projects[0] ?? null;
  const selectedProjectId = selectedProject ? String(selectedProject.id) : null;

  let team: Awaited<ReturnType<typeof getStaffProjectTeams>>["teams"][number] | null = null;
  if (selectedProjectId) {
    const numericProjectId = Number(selectedProjectId);
    if (!Number.isNaN(numericProjectId)) {
      try {
        const projectTeams = await getStaffProjectTeams(numericProjectId);
        team = projectTeams.teams[0] ?? null;
      } catch {
        team = null;
      }
    }
  }

  return (
    <div className="stack">
      <Placeholder
        title="Integrations"
        description="GitHub contributions and Trello activity."
      />

      {projectLoadError ? <p className="muted">{projectLoadError}</p> : null}

      {!selectedProjectId && !projectLoadError ? (
        <p className="muted">No projects are available for your account yet.</p>
      ) : null}

      {selectedProjectId ? (
        <div className="stack stack--loose">
          {projects.length > 1 ? (
            <nav className="pill-nav" aria-label="Select project for integrations">
              {projects.map((project) => {
                const projectId = String(project.id);
                const isActive = projectId === selectedProjectId;

                return (
                  <Link
                    key={projectId}
                    href={`/staff/integrations?projectId=${encodeURIComponent(projectId)}`}
                    className={`pill-nav__link${isActive ? " pill-nav__link--active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {project.name}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          <section className="stack" aria-label="GitHub integration">
            <h3 style={{ margin: 0 }}>GitHub activity</h3>
            <GithubProjectReposClient projectId={selectedProjectId} />
          </section>

          <section className="stack" aria-label="Trello integration">
            <h3 style={{ margin: 0 }}>Trello activity</h3>
            {team ? (
              <ProjectTrelloContent
                projectId={selectedProjectId}
                teamId={team.id}
                teamName={team.teamName}
              />
            ) : (
              <div className="stack">
                <p className="muted">
                  Trello board activity needs a team context. Open this project&apos;s Trello page to manage or inspect
                  team linkage.
                </p>
                <Link href={`/projects/${selectedProjectId}/trello`} className="pill-nav__link" style={{ width: "fit-content" }}>
                  Open project Trello
                </Link>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
