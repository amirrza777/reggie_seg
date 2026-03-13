import { getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { getCurrentUser } from "@/shared/auth/session";

export default async function ProjectsListPage() {
  const user = await getCurrentUser();
  let projects: Awaited<ReturnType<typeof getUserProjects>> = [];

  if (user) {
    try {
      projects = await getUserProjects(user.id);
    } catch {
      // leave projects empty
    }
  }

  return (
    <div className="stack ui-page projects-panel">
      <header className="projects-panel__header">
        <h1 className="projects-panel__title">Your Projects</h1>
        <p className="projects-panel__subtitle">
          {projects.length > 0
            ? "Select a project to view details, peer assessments, and more."
            : "You have no projects assigned yet."}
        </p>
      </header>
      {projects.length > 0 ? (
        <ProjectList projects={projects} />
      ) : (
        <div className="card">
          <div className="card__body">
            <p className="muted" style={{ marginBottom: 8 }}>
              Projects appear here once a staff member or admin assigns you to a team.
            </p>
            <p className="muted">
              If you believe you should be in a project, contact your module staff or administrator.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
