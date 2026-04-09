import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectsForMarking, type StaffMarkingProject } from "@/features/projects/api/client";
import { SearchField } from "@/shared/ui/SearchField";
import { highlightSearchText } from "@/shared/lib/highlightSearchText";
import "@/features/staff/projects/styles/staff-projects.css";

type ModuleGroup = {
  moduleId: number;
  moduleName: string;
  projects: StaffMarkingProject[];
};

type PageProps = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

function buildModuleGroups(projects: StaffMarkingProject[]): ModuleGroup[] {
  const moduleMap = new Map<number, ModuleGroup>();
  for (const project of projects) {
    if (!moduleMap.has(project.moduleId)) {
      moduleMap.set(project.moduleId, { moduleId: project.moduleId, moduleName: project.moduleName, projects: [] });
    }
    moduleMap.get(project.moduleId)!.projects.push(project);
  }
  return Array.from(moduleMap.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
}

export default async function StaffMarksPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const rawQuery = Array.isArray(resolvedParams.q) ? resolvedParams.q[0] : resolvedParams.q;
  const hasQuery = typeof rawQuery === "string" && rawQuery.trim().length > 0;

  let projects: StaffMarkingProject[] = [];
  let errorMessage: string | null = null;
  try {
    projects = await getStaffProjectsForMarking(user.id, { query: rawQuery });
  } catch {
    errorMessage = "Could not load projects right now. Please try again.";
  }

  const moduleGroups = buildModuleGroups(projects);
  const totalTeams = projects.reduce((sum, p) => sum + p.teams.length, 0);

  return (
    <div className="staff-projects staff-projects--panel-inset">
      <section className="staff-projects__hero">
        <h1 className="staff-projects__title">Marking</h1>
        <p className="staff-projects__desc">
          All teams across your projects. Select a team to open the marking form, set marks, and write formative feedback.
        </p>
        {!errorMessage && (
          <div className="staff-projects__meta">
            <span className="staff-projects__badge">{moduleGroups.length} module{moduleGroups.length === 1 ? "" : "s"}</span>
            <span className="staff-projects__badge">{projects.length} project{projects.length === 1 ? "" : "s"}</span>
            <span className="staff-projects__badge">{totalTeams} team{totalTeams === 1 ? "" : "s"}</span>
          </div>
        )}

        <form action="/staff/marks" method="get" className="staff-projects__search" role="search" aria-label="Search projects or teams">
          <label className="staff-projects__search-label" htmlFor="marks-search">
            Search projects or teams
          </label>
          <div className="staff-projects__search-controls">
            <SearchField
              id="marks-search"
              name="q"
              className="staff-projects__search-input"
              defaultValue={rawQuery ?? ""}
              placeholder="e.g. Team 1, Group Project"
            />
            <button type="submit" className="staff-projects__badge staff-projects__search-btn">
              Search
            </button>
            {hasQuery ? (
              <Link href="/staff/marks" className="staff-projects__badge staff-projects__search-btn">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {errorMessage ? (
        <p className="muted">{errorMessage}</p>
      ) : moduleGroups.length === 0 ? (
        <p className="muted">{hasQuery ? `No teams match "${rawQuery}".` : "No projects are assigned to your account."}</p>
      ) : (
        <section className="staff-projects__module-list" aria-label="Projects for marking">
          {moduleGroups.map((group) => (
            <details key={group.moduleId} className="staff-projects__module-group">
              <summary className="staff-projects__module-summary">
                <div className="staff-projects__module-heading">
                  <h2 className="staff-projects__module-title">{highlightSearchText(group.moduleName, rawQuery)}</h2>
                  <p className="staff-projects__module-subtitle">
                    {group.projects.length} project{group.projects.length === 1 ? "" : "s"} ·{" "}
                    {group.projects.reduce((sum, p) => sum + p.teams.length, 0)} team{group.projects.reduce((sum, p) => sum + p.teams.length, 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="staff-projects__module-toggle" aria-hidden="true" />
              </summary>

              <div className="staff-projects__module-projects">
                {group.projects.map((project) => (
                  <details key={project.id} className="staff-projects__module-project-card staff-projects__marking-project">
                    <summary className="staff-projects__marking-project-head">
                      <span className="staff-projects__marking-project-link staff-projects__module-project-title">
                        {highlightSearchText(project.name, rawQuery)}
                      </span>
                      <span className="staff-projects__marking-project-summary-right">
                        <span className="staff-projects__badge">
                          {project.teams.length} team{project.teams.length === 1 ? "" : "s"}
                        </span>
                        <span className="staff-projects__marking-project-toggle" aria-hidden="true" />
                      </span>
                    </summary>
                    {project.teams.length === 0 ? (
                      <p className="muted staff-projects__marking-empty">No teams in this project yet.</p>
                    ) : (
                      <div className="staff-projects__marking-team-panels">
                        {project.teams.map((team) => (
                          <article key={team.id} className="staff-projects__marking-team-panel">
                            <Link
                              href={`/staff/projects/${project.id}/teams/${team.id}/grading`}
                              className="staff-projects__module-project-link"
                            >
                              <div className="staff-projects__module-project-copy">
                                <span className="staff-projects__module-project-title">{highlightSearchText(team.teamName, rawQuery)}</span>
                                <span className="staff-projects__module-project-sub">
                                  {team.studentCount} student{team.studentCount === 1 ? "" : "s"}
                                  {team.inactivityFlag !== "NONE" ? ` · ${team.inactivityFlag === "RED" ? "⚠ inactive" : "⚡ low activity"}` : ""}
                                </span>
                              </div>
                              <span className="staff-projects__project-toggle" aria-hidden="true">→</span>
                            </Link>
                          </article>
                        ))}
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
