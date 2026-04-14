import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { ModuleDashboardPageView } from "@/features/modules/components/dashboard/ModuleDashboard";
import { buildModuleProjectDeadlineTimelineRows } from "@/features/modules/lib/moduleProjectDeadlineTimeline";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import type { Module } from "@/features/modules/types";
import { getProjectDeadline, getProjectMarking, getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { sortProjectsByTaskOpenDate } from "@/features/projects/lib/sortProjectsByTaskOpenDate";
import type { Project, ProjectDeadline } from "@/features/projects/types";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";

type ModulePageProps = {
  params: Promise<{ moduleId: string }>;
};

type ProjectPanelRow = {
  projectName: string;
  markRow: [string, string, string];
  meta: { completed: boolean; finishedUnmarked: boolean; mark: number | null };
  idKey: string;
  deadline: ProjectDeadline | null;
};

async function buildModuleProjectPanelData(
  userId: number,
  moduleProjects: Project[],
): Promise<{
  marksRows: Array<[string, string, string]>;
  projectMetaById: Record<string, ProjectPanelRow["meta"]>;
  projectDeadlines: Array<{ projectName: string; deadline: ProjectDeadline | null }>;
}> {
  const nowMs = Date.now();
  const rows: ProjectPanelRow[] = await Promise.all(
    moduleProjects.map(async (project): Promise<ProjectPanelRow> => {
      const projectId = Number(project.id);
      if (!Number.isFinite(projectId)) {
        return {
          projectName: project.name,
          markRow: [project.name, "Not available", project.archivedAt ? "Completed" : "In progress"],
          meta: { completed: false, finishedUnmarked: false, mark: null },
          idKey: String(project.id),
          deadline: null,
        };
      }

      let markVal: number | null = null;
      let markingFetchOk = false;
      try {
        const marking = await getProjectMarking(userId, projectId);
        markingFetchOk = true;
        markVal = marking.studentMarking?.mark ?? marking.teamMarking?.mark ?? null;
      } catch {
        markingFetchOk = false;
      }

      let deadline: ProjectDeadline | null = null;
      let latestDueMs: number | null = null;
      try {
        deadline = await getProjectDeadline(userId, projectId);
        const dueDates = [deadline.taskDueDate, deadline.assessmentDueDate, deadline.feedbackDueDate]
          .map((value) => (value ? Date.parse(value) : Number.NaN))
          .filter(Number.isFinite);
        latestDueMs = dueDates.length > 0 ? Math.max(...dueDates) : null;
      } catch {
        deadline = null;
        latestDueMs = null;
      }

      const finishedByDeadline = latestDueMs != null && latestDueMs <= nowMs;
      const isFinished = project.archivedAt != null || finishedByDeadline || markVal != null;
      const completed = markVal != null;
      const finishedUnmarked = isFinished && markVal == null;

      const markRow: [string, string, string] = !markingFetchOk
        ? [project.name, "Not available", project.archivedAt ? "Completed" : "In progress"]
        : [
            project.name,
            markVal == null ? "Not yet published" : String(markVal),
            markVal == null ? (project.archivedAt ? "Completed" : "In progress") : "Published",
          ];

      return {
        projectName: project.name,
        markRow,
        meta: { completed, finishedUnmarked, mark: markVal },
        idKey: String(project.id),
        deadline,
      };
    }),
  );

  const projectMetaById: Record<string, ProjectPanelRow["meta"]> = {};
  for (const row of rows) {
    projectMetaById[row.idKey] = row.meta;
  }

  return {
    marksRows: rows.map((r) => r.markRow),
    projectMetaById,
    projectDeadlines: rows.map((row) => ({ projectName: row.projectName, deadline: row.deadline })),
  };
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { moduleId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let modules: Module[] = [];
  try {
    modules = await listModules(user.id);
  } catch {
    modules = [];
  }

  const module = modules.find((item) => String(item.id) === moduleId);
  if (!module) notFound();

  const numericModuleId = Number(moduleId);
  let marksRows: Array<[string, string, string]> = [];
  let moduleProjects: Project[] = [];
  let projectMetaById: Record<string, { completed: boolean; finishedUnmarked: boolean; mark: number | null }> = {};
  let projectDeadlines: Array<{ projectName: string; deadline: ProjectDeadline | null }> = [];

  if (Number.isFinite(numericModuleId)) {
    try {
      const projects = await getUserProjects(user.id);
      moduleProjects = sortProjectsByTaskOpenDate(
        projects.filter((project) => project.moduleId === numericModuleId),
      );

      const built = await buildModuleProjectPanelData(user.id, moduleProjects);
      marksRows = built.marksRows;
      projectMetaById = built.projectMetaById;
      projectDeadlines = built.projectDeadlines;
    } catch {
      marksRows = [];
      moduleProjects = [];
      projectMetaById = {};
      projectDeadlines = [];
    }
  }

  const dashboard = {
    ...buildModuleDashboardData(module, marksRows),
    timelineRows: buildModuleProjectDeadlineTimelineRows(projectDeadlines),
  };

  const moduleTitle = module.title?.trim() || "Module";

  const projectsPanel = (
    <>
      <header className="projects-panel__header">
        <h1 className="projects-panel__title">{moduleTitle}</h1>
        <p className="projects-panel__subtitle">
          Select a project you are enrolled in to open its workspace, teams, and tools.
        </p>
      </header>
      <Card className="module-dashboard__panel module-dashboard__panel--projects" bodyClassName="module-dashboard__projects-body">
        {moduleProjects.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            You do not have any projects assigned in this module yet. Contact your module staff if you think this is a mistake.
          </p>
        ) : (
          <ProjectList projects={moduleProjects} projectMetaById={projectMetaById} hideModuleLine />
        )}
      </Card>
    </>
  );

  return (
    <div className="ui-page">
      <ModuleDashboardPageView dashboard={dashboard} projectsPanel={projectsPanel} />
    </div>
  );
}
