import Link from "next/link";
import { redirect } from "next/navigation";
import { GithubProjectReposClient } from "@/features/github/components/GithubProjectReposClient";
import { getStaffProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { Placeholder } from "@/shared/ui/Placeholder";

type StaffReposPageProps = {
  searchParams: Promise<{ projectId?: string | string[] }>;
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

  let projects: Awaited<ReturnType<typeof getStaffProjects>> = [];
  let projectLoadError: string | null = null;
  try {
    projects = await getStaffProjects(user.id);
  } catch (error) {
    projectLoadError = error instanceof Error ? error.message : "Failed to load your projects.";
  }

  const selectedProject =
    projects.find((project) => String(project.id) === String(requestedProjectId)) ?? projects[0] ?? null;
  const selectedProjectId = selectedProject ? String(selectedProject.id) : null;

  return (
    <div className="stack">
      <Placeholder
        title="Repository Insights"
        description="Review and manage linked GitHub repositories for your projects."
      />

      {projectLoadError ? <p className="muted">{projectLoadError}</p> : null}

      {!selectedProjectId && !projectLoadError ? (
        <p className="muted">No projects are available for your account yet.</p>
      ) : null}

      {selectedProjectId ? (
        <div className="stack stack--loose">
          {projects.length > 1 ? (
            <nav className="pill-nav" aria-label="Select project for repository insights">
              {projects.map((project) => {
                const projectId = String(project.id);
                const isActive = projectId === selectedProjectId;

                return (
                  <Link
                    key={projectId}
                    href={`/staff/repos?projectId=${encodeURIComponent(projectId)}`}
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
