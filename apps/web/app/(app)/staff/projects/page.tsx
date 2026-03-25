import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjects } from "@/features/projects/api/client";
import { StaffProjectsModuleList, type ModuleGroup } from "@/features/staff/projects/components/StaffProjectsModuleList";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";
import { SearchField } from "@/shared/ui/SearchField";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProject = Awaited<ReturnType<typeof getStaffProjects>>[number];

type StaffProjectsPageProps = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

function toStaffLoadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  return error instanceof Error ? error.message : fallback;
}

function buildModuleGroups(projects: StaffProject[]): ModuleGroup[] {
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

  return Array.from(moduleMap.values())
    .map((group) => ({
      ...group,
      projects: [...group.projects].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
}

export default async function StaffProjectsPage({ searchParams }: StaffProjectsPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawQuery = Array.isArray(resolvedSearchParams.q) ? resolvedSearchParams.q[0] : resolvedSearchParams.q;
  const hasQuery = typeof rawQuery === "string" && rawQuery.trim().length > 0;

  let projects: StaffProject[] = [];
  let errorMessage: string | null = null;
  try {
    projects = await getStaffProjects(user.id, { query: rawQuery });
  } catch (error) {
    errorMessage = toStaffLoadErrorMessage(error, "Failed to load staff projects.");
  }

  const modules = buildModuleGroups(projects);
  const visibleProjectCount = modules.reduce((sum, module) => sum + module.projects.length, 0);

  return (
    <div className="staff-projects staff-projects--panel-inset">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Staff Workspace</p>
        <h1 className="staff-projects__title">Projects</h1>
        <p className="staff-projects__desc">Navigate by module, open a project, then choose the team workspace you need.</p>
        {!errorMessage ? (
          <div className="staff-projects__meta">
            <span className="staff-projects__badge">
              {hasQuery ? visibleProjectCount : projects.length} project{(hasQuery ? visibleProjectCount : projects.length) === 1 ? "" : "s"}
            </span>
            <span className="staff-projects__badge">
              {modules.length} module{modules.length === 1 ? "" : "s"}
            </span>
            <Link href="/staff/modules" className="staff-projects__badge">
              Create project from module
            </Link>
          </div>
        ) : null}

        <form action="/staff/projects" method="get" className="staff-projects__search" role="search" aria-label="Search modules or projects">
          <label className="staff-projects__search-label" htmlFor="staff-projects-search">
            Search modules or projects
          </label>
          <div className="staff-projects__search-controls">
            <SearchField
              id="staff-projects-search"
              name="q"
              className="staff-projects__search-input"
              defaultValue={rawQuery ?? ""}
              placeholder="e.g. Data Structures, Group Project"
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
      {!errorMessage && projects.length === 0 ? <p className="muted">No staff projects found yet. Ask an admin to assign you as a module lead.</p> : null}
      {!errorMessage && hasQuery && modules.length === 0 ? <p className="muted">No modules or projects match "{rawQuery}".</p> : null}

      <StaffProjectsModuleList modules={modules} hasQuery={hasQuery} rawQuery={rawQuery} />
    </div>
  );
}
