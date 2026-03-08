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
          {projects.length > 0 ? "Select a project to view details, peer assessments, and more." : "You have no projects assigned."}
        </p>
      </header>
      {projects.length > 0 ? <ProjectList projects={projects} /> : null}
    </div>
  );
}
