import { getProjectMarking, getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { getCurrentUser } from "@/shared/auth/session";

export default async function ProjectsListPage() {
  const user = await getCurrentUser();
  let projects: Awaited<ReturnType<typeof getUserProjects>> = [];
  const projectMetaById: Record<string, { completed: boolean; mark: number | null }> = {};

  if (user) {
    try {
      projects = await getUserProjects(user.id);

      const metaEntries = await Promise.all(
        projects.map(async (project) => {
          const projectId = Number(project.id);
          if (!Number.isFinite(projectId)) {
            return [String(project.id), { completed: false, mark: null }] as const;
          }

          let mark: number | null = null;
          try {
            const marking = await getProjectMarking(user.id, projectId);
            mark = marking.studentMarking?.mark ?? marking.teamMarking?.mark ?? null;
          } catch {
            mark = null;
          }
          const completed = project.archivedAt != null || mark != null;

          return [String(project.id), { completed, mark }] as const;
        }),
      );

      for (const [projectId, meta] of metaEntries) {
        projectMetaById[projectId] = meta;
      }
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
        <ProjectList projects={projects} projectMetaById={projectMetaById} />
      ) : (
        <div className="card">
          <div className="card__body projects-panel__empty-copy">
            <p className="muted">
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
