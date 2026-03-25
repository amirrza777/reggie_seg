import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffModuleProjectCardList } from "@/features/staff/projects/components/StaffModuleProjectCard";
import { loadStaffProjectsWithTeamsForPage, mapProjectsToModuleCards } from "@/features/staff/projects/lib/staffModuleProjectsPageData";
import { resolveStaffModuleWorkspaceAccess } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";
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

  const { projects, errorMessage } = await loadStaffProjectsWithTeamsForPage(ctx.user.id, {
    moduleId: parsedModuleId,
    query: rawQuery,
  });

  const cardProjects = mapProjectsToModuleCards(projects);
  const visibleProjectCount = cardProjects.length;
  const projectsBase = `/staff/modules/${encodeURIComponent(moduleId)}/projects`;

  return (
    <div className="stack">
      <h2 className="overview-title">Projects &amp; teams</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Expand a project to see teams, open the staff project hub, or jump into team allocation. Search filters the list
        below.
      </p>

      {!errorMessage ? (
        <div className="staff-projects__meta" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <span className="staff-projects__badge">
            {hasQuery ? visibleProjectCount : projects.length} project
            {(hasQuery ? visibleProjectCount : projects.length) === 1 ? "" : "s"}
            {hasQuery ? " (filtered)" : ""}
          </span>
          {access.createProjectInModule ? (
            <Link
              href={`/staff/projects/create?moduleId=${encodeURIComponent(String(parsedModuleId))}`}
              className="staff-projects__badge"
            >
              Create project
            </Link>
          ) : null}
        </div>
      ) : null}

      {!errorMessage ? (
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
      ) : null}

      {errorMessage ? <p className="muted">{errorMessage}</p> : null}
      {!errorMessage && projects.length === 0 ? (
        <p className="muted">
          {hasQuery && rawQuery?.trim()
            ? `No projects match "${rawQuery.trim()}".`
            : "No projects in this module yet."}
        </p>
      ) : null}

      {!errorMessage && cardProjects.length > 0 ? (
        <StaffModuleProjectCardList projects={cardProjects} hasQuery={hasQuery} rawQuery={rawQuery} />
      ) : null}
    </div>
  );
}
