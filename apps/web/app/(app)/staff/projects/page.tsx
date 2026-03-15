import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { getStaffProjectTeams, getStaffProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { filterBySearchQuery, matchesSearchQuery, normalizeSearchQuery } from "@/shared/lib/search";
import "@/features/staff/projects/styles/staff-projects.css";

type ProjectTeamLink = {
  id: number;
  teamName: string;
  memberCount: number;
};

type StaffProjectWithTeams = Awaited<ReturnType<typeof getStaffProjects>>[number] & {
  teams: ProjectTeamLink[];
  teamFetchFailed: boolean;
};

type ModuleGroup = {
  moduleId: number;
  moduleName: string;
  projects: StaffProjectWithTeams[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSearchText(text: string, query?: string): ReactNode {
  const terms = String(query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(pattern);
  if (parts.length <= 1) return text;

  const lowerTerms = new Set(terms.map((term) => term.toLowerCase()));
  return parts.map((part, index) =>
    lowerTerms.has(part.toLowerCase()) ? (
      <mark key={`hit-${index}`} className="staff-projects__search-hit">
        {part}
      </mark>
    ) : (
      <Fragment key={`txt-${index}`}>{part}</Fragment>
    ),
  );
}

type StaffProjectsPageProps = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

export default async function StaffProjectsPage({ searchParams }: StaffProjectsPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawQuery = Array.isArray(resolvedSearchParams.q) ? resolvedSearchParams.q[0] : resolvedSearchParams.q;
  const normalizedQuery = normalizeSearchQuery(rawQuery ?? "");
  const hasQuery = normalizedQuery.length > 0;

  let projects: StaffProjectWithTeams[] = [];
  let errorMessage: string | null = null;
  try {
    const baseProjects = await getStaffProjects(user.id);
    projects = await Promise.all(
      baseProjects.map(async (project) => {
        try {
          const projectTeams = await getStaffProjectTeams(user.id, project.id);
          return {
            ...project,
            teams: projectTeams.teams
              .map((team) => ({
                id: team.id,
                teamName: team.teamName,
                memberCount: team.allocations.length,
              }))
              .sort((a, b) => a.teamName.localeCompare(b.teamName)),
            teamFetchFailed: false,
          };
        } catch {
          return {
            ...project,
            teams: [],
            teamFetchFailed: true,
          };
        }
      }),
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load staff projects.";
  }

  const moduleMap = new Map<number, ModuleGroup>();
  for (const project of projects) {
    const existing = moduleMap.get(project.moduleId);
    if (existing) {
      existing.projects.push(project);
      continue;
    }
    moduleMap.set(project.moduleId, {
      moduleId: project.moduleId,
      moduleName: project.moduleName,
      projects: [project],
    });
  }

  const modules = Array.from(moduleMap.values())
    .map((group) => ({
      ...group,
      projects: [...group.projects].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));

  const visibleModules = !hasQuery
    ? modules.map((module) => ({
        ...module,
        projects: module.projects.map((project) => ({ ...project, visibleTeams: project.teams })),
      }))
    : modules
        .map((module) => {
          const moduleMatches = matchesSearchQuery(module, normalizedQuery, { fields: ["moduleName"] });

          const visibleProjects = module.projects
            .map((project) => {
              const projectMatches = matchesSearchQuery(project, normalizedQuery, { fields: ["name"] });
              const matchedTeams = filterBySearchQuery(project.teams, normalizedQuery, { fields: ["teamName"] });

              if (moduleMatches || projectMatches) {
                return { ...project, visibleTeams: project.teams };
              }
              if (matchedTeams.length > 0) {
                return { ...project, visibleTeams: matchedTeams };
              }
              return null;
            })
            .filter((project): project is StaffProjectWithTeams & { visibleTeams: ProjectTeamLink[] } => project !== null);

          if (moduleMatches) {
            return {
              ...module,
              projects: module.projects.map((project) => ({ ...project, visibleTeams: project.teams })),
            };
          }

          if (visibleProjects.length > 0) {
            return {
              ...module,
              projects: visibleProjects,
            };
          }

          return null;
        })
        .filter(
          (
            module,
          ): module is ModuleGroup & { projects: Array<StaffProjectWithTeams & { visibleTeams: ProjectTeamLink[] }> } =>
            module !== null,
        );

  const visibleProjectCount = visibleModules.reduce((sum, module) => sum + module.projects.length, 0);

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Staff Workspace</p>
        <h1 className="staff-projects__title">Projects</h1>
        <p className="staff-projects__desc">
          Navigate by module, then project, then jump directly into the team workspace you need.
        </p>
        {!errorMessage ? (
          <div className="staff-projects__meta">
            <span className="staff-projects__badge">
              {hasQuery ? visibleProjectCount : projects.length} project{(hasQuery ? visibleProjectCount : projects.length) === 1 ? "" : "s"}
            </span>
            <span className="staff-projects__badge">
              {hasQuery ? visibleModules.length : modules.length} module{(hasQuery ? visibleModules.length : modules.length) === 1 ? "" : "s"}
            </span>
            <Link href="/staff/modules" className="staff-projects__badge">
              Create project from module
            </Link>
          </div>
        ) : null}

        <form action="/staff/projects" method="get" className="staff-projects__search" role="search" aria-label="Search modules or teams">
          <label className="staff-projects__search-label" htmlFor="staff-projects-search">
            Search modules or teams
          </label>
          <div className="staff-projects__search-controls">
            <input
              id="staff-projects-search"
              name="q"
              type="search"
              className="staff-projects__search-input"
              defaultValue={rawQuery ?? ""}
              placeholder="e.g. Data Structures, Team 3"
            />
            <button type="submit" className="staff-projects__badge staff-projects__search-btn">
              Search
            </button>
            {hasQuery ? (
              <Link href="/staff/projects" className="staff-projects__badge staff-projects__search-btn">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {errorMessage ? <p className="muted">{errorMessage}</p> : null}
      {!errorMessage && projects.length === 0 ? (
        <p className="muted">No staff projects found yet. Ask an admin to assign you as a module lead.</p>
      ) : null}
      {!errorMessage && hasQuery && visibleModules.length === 0 ? (
        <p className="muted">No modules or teams match "{rawQuery}".</p>
      ) : null}

      <section className="staff-projects__module-list" aria-label="Staff projects grouped by module">
        {visibleModules.map((module) => {
          const teamTotal = module.projects.reduce((sum, project) => sum + project.visibleTeams.length, 0);
          return (
            <details key={module.moduleId} className="staff-projects__module-group" open={hasQuery}>
              <summary className="staff-projects__module-summary">
                <div className="staff-projects__module-heading">
                  <h2 className="staff-projects__module-title">{highlightSearchText(module.moduleName, rawQuery)}</h2>
                  <p className="staff-projects__module-subtitle">
                    {module.projects.length} project{module.projects.length === 1 ? "" : "s"} · {teamTotal} team{teamTotal === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="staff-projects__module-toggle" aria-hidden="true" />
              </summary>

              <div className="staff-projects__module-projects">
                {module.projects.map((project) => {
                  const repoOk = project.hasGithubRepo;
                  const allConnected = project.membersTotal > 0 && project.membersConnected === project.membersTotal;
                  const someConnected =
                    project.membersTotal > 0 && project.membersConnected > 0 && project.membersConnected < project.membersTotal;
                  const noneConnected = project.membersTotal > 0 && project.membersConnected === 0;

                  return (
                    <details key={project.id} className="staff-projects__module-project-card" open={hasQuery}>
                      <summary className="staff-projects__module-project-summary">
                        <div className="staff-projects__module-project-head">
                          <div className="staff-projects__module-project-copy">
                            <h3 className="staff-projects__module-project-title">
                              {highlightSearchText(project.name, rawQuery)}
                            </h3>
                            <p className="staff-projects__module-project-sub">
                              {project.teamCount} team{project.teamCount === 1 ? "" : "s"} available for staff review.
                            </p>
                          </div>
                          <div className="staff-projects__gh-health">
                            <span
                              className={`staff-projects__gh-pill ${
                                repoOk ? "staff-projects__gh-pill--ok" : "staff-projects__gh-pill--warn"
                              }`}
                            >
                              {repoOk ? "✓ Repo linked" : "⚠ No repo"}
                            </span>
                            {project.membersTotal > 0 && (
                              <span
                                className={`staff-projects__gh-pill ${
                                  allConnected
                                    ? "staff-projects__gh-pill--ok"
                                    : someConnected
                                      ? "staff-projects__gh-pill--partial"
                                      : noneConnected
                                        ? "staff-projects__gh-pill--warn"
                                        : ""
                                }`}
                              >
                                {project.membersConnected}/{project.membersTotal} GitHub
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="staff-projects__project-toggle" aria-hidden="true" />
                      </summary>

                      <div className="staff-projects__module-project-content">
                        <div className="staff-projects__module-project-actions">
                          <Link href={`/staff/projects/${project.id}`} className="staff-projects__badge">
                            Open project
                          </Link>
                          <Link href={`/staff/projects/${project.id}/team-allocation`} className="staff-projects__badge">
                            Team allocation
                          </Link>
                        </div>

                        <div className="staff-projects__module-team-list" aria-label={`Teams in ${project.name}`}>
                          {project.visibleTeams.length > 0 ? (
                            project.visibleTeams.map((team) => (
                              <Link
                                key={team.id}
                                href={`/staff/projects/${project.id}/teams/${team.id}`}
                                className="staff-projects__module-team-link"
                              >
                                <span>{highlightSearchText(team.teamName, rawQuery)}</span>
                                <span className="staff-projects__module-team-meta">
                                  {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                                </span>
                              </Link>
                            ))
                          ) : (
                            <p className="muted">
                              {project.teamFetchFailed ? "Could not load teams right now." : "No teams in this project yet."}
                            </p>
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
