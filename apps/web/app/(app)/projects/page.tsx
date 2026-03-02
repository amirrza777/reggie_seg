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
    <div className="stack">
      <div>
        <h1>Your Projects</h1>
        <p>
          {projects.length > 0 ? "Select a project to view details, peer assessments, and more." : "You have no projects assigned."}
        </p>
      </div>
     {projects.length > 0 ? <ProjectList projects={projects} /> : null}
    </div>
  );
}
