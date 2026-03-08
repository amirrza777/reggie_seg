import { getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { getCurrentUser } from "@/shared/auth/session";
import { Placeholder } from "@/shared/ui/Placeholder";

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
      <Placeholder
        title="Your Projects"
        description={
          projects.length > 0
            ? "Select a project to view details, peer assessments, and more."
            : "You have no projects assigned."
        }
      />
      {projects.length > 0 ? <ProjectList projects={projects} /> : null}
    </div>
  );
}
