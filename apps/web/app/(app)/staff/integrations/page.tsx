import Link from "next/link";
import { GithubProjectReposClient } from "@/features/github/components/GithubProjectReposClient";
import { getStaffProjectTeams, getStaffProjects } from "@/features/projects/api/client";
import { ProjectTrelloContent } from "@/features/trello/components/ProjectTrelloContent";
import { StaffTrelloSummaryView } from "@/features/staff/trello/StaffTrelloSummaryView";
import { Placeholder } from "@/shared/ui/Placeholder";
import { SearchField } from "@/shared/ui/SearchField";
import { redirect } from "next/navigation";
import { getCurrentUser, isElevatedStaff } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffIntegrationsPageProps = {
  searchParams: Promise<{ projectId?: string | string[]; q?: string | string[] }>;
};

type StaffProject = Awaited<ReturnType<typeof getStaffProjects>>[number];

function resolveSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveSelectedProject(projects: StaffProject[], requestedProjectId: string | undefined) {
  return projects.find((project) => String(project.id) === String(requestedProjectId)) ?? projects[0] ?? null;
}

function buildProjectHref(projectId: string, rawProjectQuery: string | undefined) {
  if (!rawProjectQuery || rawProjectQuery.trim().length === 0) {
    return `/staff/integrations?projectId=${encodeURIComponent(projectId)}`;
  }
  return `/staff/integrations?projectId=${encodeURIComponent(projectId)}&q=${encodeURIComponent(rawProjectQuery)}`;
}

async function loadPrimaryTeam(userId: number, selectedProjectId: string | null) {
  if (!selectedProjectId) return null;
  const numericProjectId = Number(selectedProjectId);
  if (Number.isNaN(numericProjectId)) return null;

  try {
    const projectTeams = await getStaffProjectTeams(userId, numericProjectId);
    return projectTeams.teams[0] ?? null;
  } catch {
    return null;
  }
}

function ProjectSearchForm({
  rawProjectQuery,
  selectedProjectId,
  hasProjectQuery,
}: {
  rawProjectQuery: string | undefined;
  selectedProjectId: string | null;
  hasProjectQuery: boolean;
}) {
  return (
    <form method="get" action="/staff/integrations" className="staff-projects__search" role="search" aria-label="Search projects for integrations">
      <label className="staff-projects__search-label" htmlFor="staff-integrations-project-search">
        Search projects
      </label>
      <div className="staff-projects__search-controls">
        <SearchField
          id="staff-integrations-project-search"
          name="q"
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
  );
}

function ProjectTabs({
  projects,
  selectedProjectId,
  rawProjectQuery,
}: {
  projects: StaffProject[];
  selectedProjectId: string;
  rawProjectQuery: string | undefined;
}) {
  if (projects.length <= 1) return null;

  return (
    <nav className="pill-nav" aria-label="Select project for integrations">
      {projects.map((project) => {
        const projectId = String(project.id);
        const isActive = projectId === selectedProjectId;
        const href = buildProjectHref(projectId, rawProjectQuery);
        return (
          <Link key={projectId} href={href} className={`pill-nav__link${isActive ? " pill-nav__link--active" : ""}`} aria-current={isActive ? "page" : undefined}>
            {project.name}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function StaffIntegrationsPage({ searchParams }: StaffIntegrationsPageProps) {
  const user = await getCurrentUser();
  if (!isElevatedStaff(user)) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const requestedProjectId = resolveSearchValue(resolvedSearchParams.projectId);
  const rawProjectQuery = resolveSearchValue(resolvedSearchParams.q);
  const hasProjectQuery = typeof rawProjectQuery === "string" && rawProjectQuery.trim().length > 0;

  let projects: Awaited<ReturnType<typeof getStaffProjects>> = [];
  let projectLoadError: string | null = null;

  try {
    projects = await getStaffProjects(user.id, { query: rawProjectQuery });
  } catch (err) {
    projectLoadError = err instanceof Error ? err.message : "Failed to load your projects.";
  }

  const visibleProjects = projects;
  const selectedProject = resolveSelectedProject(visibleProjects, requestedProjectId);
  const selectedProjectId = selectedProject ? String(selectedProject.id) : null;

  const team = await loadPrimaryTeam(user.id, selectedProjectId);

  return (
    <div className="stack ui-page">
      <Placeholder
        title="Integrations"
        description="GitHub contributions and Trello activity."
      />

      {projectLoadError ? <p className="muted">{projectLoadError}</p> : null}
      {!projectLoadError ? <ProjectSearchForm rawProjectQuery={rawProjectQuery} selectedProjectId={selectedProjectId} hasProjectQuery={hasProjectQuery} /> : null}

      {!selectedProjectId && !projectLoadError ? (
        <p className="muted">
          {hasProjectQuery
            ? `No projects match "${rawProjectQuery}".`
            : "No projects are available for your account yet."}
        </p>
      ) : null}

      {selectedProjectId ? (
        <div className="stack stack--loose">
          <ProjectTabs projects={visibleProjects} selectedProjectId={selectedProjectId} rawProjectQuery={rawProjectQuery} />

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
