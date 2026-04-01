import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjects } from "@/features/projects/api/client";
import { resolveStaffModuleWorkspaceAccess } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";
import { ProjectCard } from "@/features/staff/projects/components/StaffProjectsModuleList";
import { SearchField } from "@/shared/ui/SearchField";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ moduleId: string }>;
  searchParams?: Promise<{ q?: string | string[] }>;
};

export default async function StaffModuleProjectsPage({ params, searchParams }: PageProps) {
  const { moduleId } = await params;
  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const { parsedModuleId } = ctx;
  const access = resolveStaffModuleWorkspaceAccess(ctx);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawQuery = Array.isArray(resolvedSearchParams.q) ? resolvedSearchParams.q[0] : resolvedSearchParams.q;
  const hasQuery = typeof rawQuery === "string" && rawQuery.trim().length > 0;

  let projects: Awaited<ReturnType<typeof getStaffProjects>> = [];
  let errorMessage: string | null = null;
  try {
    projects = (await getStaffProjects(ctx.user.id, { moduleId: parsedModuleId, query: rawQuery })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load projects.";
  }

  const createHref = access.canCreateProject
    ? `/staff/projects/create?moduleId=${encodeURIComponent(String(parsedModuleId))}`
    : null;
  const projectsBase = `/staff/modules/${encodeURIComponent(moduleId)}/projects`;

  return (
    <div className="stack module-dashboard">
      <div style={{ display: "grid", gap: 6 }}>
        <h2 className="overview-title">Projects &amp; teams</h2>
        <p className="muted">Open a project to access team workspaces, allocation, and grading.</p>
      </div>

      {!errorMessage ? (
        <>
          <div className="staff-projects__meta" style={{ marginTop: 0 }}>
            <span className="staff-projects__badge">
              {projects.length} project{projects.length === 1 ? "" : "s"}
              {hasQuery ? " (filtered)" : ""}
            </span>
            {createHref ? (
              <Link href={createHref} className="staff-projects__badge">
                Create project
              </Link>
            ) : null}
          </div>

          <form action={projectsBase} method="get" className="staff-projects__search" role="search" aria-label="Search projects">
            <label className="staff-projects__search-label" htmlFor="staff-module-projects-search">
              Search projects
            </label>
            <div className="staff-projects__search-controls">
              <SearchField
                id="staff-module-projects-search"
                name="q"
                className="staff-projects__search-input"
                defaultValue={rawQuery ?? ""}
                placeholder="e.g. Group project, coursework"
              />
              <button type="submit" className="staff-projects__badge staff-projects__search-btn">
                Search
              </button>
              {hasQuery ? (
                <Link href={projectsBase} className="staff-projects__badge staff-projects__search-btn">
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </>
      ) : null}

      {errorMessage ? (
        <p className="muted">{errorMessage}</p>
      ) : projects.length === 0 ? (
        <p className="muted">
          {hasQuery && rawQuery?.trim()
            ? `No projects match "${rawQuery.trim()}".`
            : "No projects in this module yet."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} rawQuery={rawQuery ?? undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
