import { getProjectDeadline, getProjectMarking, getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";
import {
  resolveProjectMarkValue,
  resolveProjectWorkflowState,
  type ProjectWorkflowState,
} from "@/features/projects/lib/projectWorkflowState";
import { getCurrentUser } from "@/shared/auth/session";

export default async function ProjectsListPage() {
  const user = await getCurrentUser();
  let projects: Awaited<ReturnType<typeof getUserProjects>> = [];
  const projectMetaById: Record<string, { state: ProjectWorkflowState; mark: number | null }> = {};

  if (user) {
    try {
      projects = await getUserProjects(user.id);

      const metaEntries = await Promise.all(
        projects.map(async (project) => {
          const projectId = Number(project.id);
          if (!Number.isFinite(projectId)) {
            return [String(project.id), { state: "active", mark: null }] as const;
          }

          const [marking, deadline] = await Promise.all([
            (async () => {
              try {
                return await getProjectMarking(user.id, projectId);
              } catch {
                return null;
              }
            })(),
            (async () => {
              try {
                return await getProjectDeadline(user.id, projectId);
              } catch {
                return null;
              }
            })(),
          ]);

          const mark = resolveProjectMarkValue(marking);
          const state = resolveProjectWorkflowState({
            project,
            deadline,
            markValue: mark,
          });

          return [String(project.id), { state, mark }] as const;
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
