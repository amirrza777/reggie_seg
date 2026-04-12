import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { ModuleDashboardPageView } from "@/features/modules/components/ModuleDashboard";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import type { Module } from "@/features/modules/types";
import { getProjectDeadline, getProjectMarking, getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { sortProjectsByTaskOpenDate } from "@/features/projects/lib/sortProjectsByTaskOpenDate";
import type { Project } from "@/features/projects/types";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";

type ModulePageProps = {
  params: Promise<{ moduleId: string }>;
};

type ProjectPanelRow = {
  markRow: [string, string, string];
  meta: { completed: boolean; finishedUnmarked: boolean; mark: number | null };
  idKey: string;
};

async function buildModuleProjectPanelData(
  userId: number,
  moduleProjects: Project[],
): Promise<{ marksRows: Array<[string, string, string]>; projectMetaById: Record<string, ProjectPanelRow["meta"]> }> {
  const nowMs = Date.now();
  const rows: ProjectPanelRow[] = await Promise.all(
    moduleProjects.map(async (project): Promise<ProjectPanelRow> => {
      const projectId = Number(project.id);
      if (!Number.isFinite(projectId)) {
        return {
          markRow: [project.name, "Not available", project.archivedAt ? "Completed" : "In progress"],
          meta: { completed: false, finishedUnmarked: false, mark: null },
          idKey: String(project.id),
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

      let latestDueMs: number | null = null;
      try {
        const deadline = await getProjectDeadline(userId, projectId);
        const dueDates = [deadline.taskDueDate, deadline.assessmentDueDate, deadline.feedbackDueDate]
          .map((value) => (value ? Date.parse(value) : Number.NaN))
          .filter(Number.isFinite);
        latestDueMs = dueDates.length > 0 ? Math.max(...dueDates) : null;
      } catch {
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
        markRow,
        meta: { completed, finishedUnmarked, mark: markVal },
        idKey: String(project.id),
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

  if (Number.isFinite(numericModuleId)) {
    try {
      const projects = await getUserProjects(user.id);
      moduleProjects = sortProjectsByTaskOpenDate(
        projects.filter((project) => project.moduleId === numericModuleId),
      );

      const built = await buildModuleProjectPanelData(user.id, moduleProjects);
      marksRows = built.marksRows;
      projectMetaById = built.projectMetaById;
    } catch {
      marksRows = [];
      moduleProjects = [];
      projectMetaById = {};
    }
  }

  const dashboard = buildModuleDashboardData(module, marksRows);

  const projectsPanel = (
    <Card title="Projects in this module" className="module-dashboard__panel">
      <p>
        Select a project you are enrolled in to open its workspace, teams, and tools.
      </p>
      {moduleProjects.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          You do not have any projects assigned in this module yet. Contact your module staff if you think this is a mistake.
        </p>
      ) : (
        <ProjectList projects={moduleProjects} projectMetaById={projectMetaById} hideModuleLine />
      )}
    </Card>
  );

  return <ModuleDashboardPageView dashboard={dashboard} projectsPanel={projectsPanel} />;
}
