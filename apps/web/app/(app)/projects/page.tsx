import { getProjectDeadline, getProjectMarking, getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { getCurrentUser } from "@/shared/auth/session";

export default async function ProjectsListPage() {
  const user = await getCurrentUser();
  let projects: Awaited<ReturnType<typeof getUserProjects>> = [];
  const projectMetaById: Record<string, { completed: boolean; finishedUnmarked: boolean; mark: number | null }> = {};

  if (user) {
    try {
      projects = await getUserProjects(user.id);
      const nowMs = Date.now();

      const metaEntries = await Promise.all(
        projects.map(async (project) => {
          const projectId = Number(project.id);
          if (!Number.isFinite(projectId)) {
            return [String(project.id), { completed: false, finishedUnmarked: false, mark: null }] as const;
          }

          const [mark, latestDueMs] = await Promise.all([
            (async () => {
              try {
                const marking = await getProjectMarking(user.id, projectId);
                return marking.studentMarking?.mark ?? marking.teamMarking?.mark ?? null;
              } catch {
                return null;
              }
            })(),
            (async () => {
              try {
                const deadline = await getProjectDeadline(user.id, projectId);
                const dueDates = [deadline.taskDueDate, deadline.assessmentDueDate, deadline.feedbackDueDate]
                  .map((value) => (value ? Date.parse(value) : Number.NaN))
                  .filter(Number.isFinite);
                return dueDates.length > 0 ? Math.max(...dueDates) : null;
              } catch {
                return null;
              }
            })(),
          ]);

          const finishedByDeadline = latestDueMs != null && latestDueMs <= nowMs;
          const isFinished = project.archivedAt != null || finishedByDeadline || mark != null;
          const completed = mark != null;
          const finishedUnmarked = isFinished && mark == null;

          return [String(project.id), { completed, finishedUnmarked, mark }] as const;
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
