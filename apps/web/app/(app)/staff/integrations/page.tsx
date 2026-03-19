import Link from "next/link";
import { GithubProjectReposClient } from "@/features/github/components/GithubProjectReposClient";
import { getStaffProjectTeams, getStaffProjects } from "@/features/projects/api/client";
import { ProjectTrelloContent } from "@/features/trello/components/ProjectTrelloContent";
import { StaffTrelloSummaryView } from "@/features/staff/trello/StaffTrelloSummaryView";
import { Placeholder } from "@/shared/ui/Placeholder";
import { redirect } from "next/navigation";
import { getCurrentUser, isElevatedStaff } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffIntegrationsPageProps = {
  searchParams: Promise<{ projectId?: string | string[]; q?: string | string[] }>;
};

export default async function StaffIntegrationsPage({ searchParams }: StaffIntegrationsPageProps) {
  const user = await getCurrentUser();
  if (!isElevatedStaff(user)) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const requestedProjectId = Array.isArray(resolvedSearchParams.projectId)
    ? resolvedSearchParams.projectId[0]
    : resolvedSearchParams.projectId;
  const rawProjectQuery = Array.isArray(resolvedSearchParams.q) ? resolvedSearchParams.q[0] : resolvedSearchParams.q;
  const hasProjectQuery = typeof rawProjectQuery === "string" && rawProjectQuery.trim().length > 0;

  let projects: Awaited<ReturnType<typeof getStaffProjects>> = [];
  let projectLoadError: string | null = null;

  try {
    projects = await getStaffProjects(user.id, { query: rawProjectQuery });
  } catch (err) {
    projectLoadError = err instanceof Error ? err.message : "Failed to load your projects.";
  }

  const visibleProjects = projects;

  const selectedProject =
    visibleProjects.find((project) => String(project.id) === String(requestedProjectId)) ?? visibleProjects[0] ?? null;
  const selectedProjectId = selectedProject ? String(selectedProject.id) : null;

  let team: Awaited<ReturnType<typeof getStaffProjectTeams>>["teams"][number] | null = null;
  if (selectedProjectId) {
    const numericProjectId = Number(selectedProjectId);
    if (!Number.isNaN(numericProjectId)) {
      try {
        const projectTeams = await getStaffProjectTeams(user.id, numericProjectId);
        team = projectTeams.teams[0] ?? null;
      } catch {
        team = null;
      }
    }
  }

  return (
    <div className="stack ui-page">
      <Placeholder
        title="Integrations"
        description="GitHub contributions and Trello activity."
      />

      {projectLoadError ? <p className="muted">{projectLoadError}</p> : null}
      {!projectLoadError ? (
        <form method="get" action="/staff/integrations" className="staff-projects__search" role="search" aria-label="Search projects for integrations">
          <label className="staff-projects__search-label" htmlFor="staff-integrations-project-search">
            Search projects
          </label>
          <div className="staff-projects__search-controls">
            <input
              id="staff-integrations-project-search"
              name="q"
              type="search"
              className="staff-projects__search-input"
              defaultValue={rawProjectQuery ?? ""}
              placeholder="Search by project or module name"
            />
            {selectedProjectId ? <input type="hidden" name="projectId" value={selectedProjectId} /> : null}
            <button type="submit" className="staff-projects__badge staff-projects__search-btn">
              Search
            </button>
            {hasProjectQuery ? (
              <Link href="/staff/integrations" className="staff-projects__badge staff-projects__search-btn">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      ) : null}

      {!selectedProjectId && !projectLoadError ? (
        <p className="muted">
          {hasProjectQuery
            ? `No projects match "${rawProjectQuery}".`
            : "No projects are available for your account yet."}
        </p>
      ) : null}

      {selectedProjectId ? (
        <div className="stack stack--loose">
          {visibleProjects.length > 1 ? (
            <nav className="pill-nav" aria-label="Select project for integrations">
              {visibleProjects.map((project) => {
                const projectId = String(project.id);
                const isActive = projectId === selectedProjectId;
                const href = hasProjectQuery
                  ? `/staff/integrations?projectId=${encodeURIComponent(projectId)}&q=${encodeURIComponent(rawProjectQuery ?? "")}`
                  : `/staff/integrations?projectId=${encodeURIComponent(projectId)}`;

                return (
                  <Link
                    key={projectId}
                    href={href}
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
                viewComponent={StaffTrelloSummaryView}
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
