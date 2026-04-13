import Link from "next/link";
import { redirect } from "next/navigation";
import { GithubProjectReposClient } from "@/features/github/components/repos/GithubProjectReposClient";
import { getStaffProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { Placeholder } from "@/shared/ui/Placeholder";
import { SearchField } from "@/shared/ui/SearchField";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffReposPageProps = {
  searchParams: Promise<{ projectId?: string | string[]; q?: string | string[] }>;
};

export default async function StaffReposPage({ searchParams }: StaffReposPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
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
  } catch (error) {
    projectLoadError = error instanceof Error ? error.message : "Failed to load your projects.";
  }

  const visibleProjects = projects;

  const selectedProject =
    visibleProjects.find((project) => String(project.id) === String(requestedProjectId)) ?? visibleProjects[0] ?? null;
  const selectedProjectId = selectedProject ? String(selectedProject.id) : null;

  return (
    <div className="stack">
      <Placeholder
        title="Repository Insights"
        description="Review and manage linked GitHub repositories for your projects."
      />

      {projectLoadError ? <p className="muted">{projectLoadError}</p> : null}
      {!projectLoadError ? (
        <form method="get" action="/staff/repos" className="staff-projects__search" role="search" aria-label="Search projects for repository insights">
          <label className="staff-projects__search-label" htmlFor="staff-repos-project-search">
            Search projects
          </label>
          <div className="staff-projects__search-controls">
            <SearchField
              id="staff-repos-project-search"
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
              <Link href="/staff/repos" className="staff-projects__badge staff-projects__search-btn">
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
            <nav className="pill-nav" aria-label="Select project for repository insights">
              {visibleProjects.map((project) => {
                const projectId = String(project.id);
                const isActive = projectId === selectedProjectId;
                const href = hasProjectQuery
                  ? `/staff/repos?projectId=${encodeURIComponent(projectId)}&q=${encodeURIComponent(rawProjectQuery ?? "")}`
                  : `/staff/repos?projectId=${encodeURIComponent(projectId)}`;

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

          {selectedProject ? (
            <section className="card stack" style={{ gap: 8 }}>
              <p className="muted" style={{ margin: 0, textTransform: "uppercase", letterSpacing: 0.35, fontSize: 12 }}>
                Selected Project
              </p>
              <h3 style={{ margin: 0 }}>{selectedProject.name}</h3>
              <p className="muted" style={{ margin: 0 }}>
                Module: {selectedProject.moduleName || "Unassigned"}
              </p>
            </section>
          ) : null}

          <section className="stack" aria-label="GitHub repository insights">
            <GithubProjectReposClient projectId={selectedProjectId} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
