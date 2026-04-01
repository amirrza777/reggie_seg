import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { ModuleDashboardPageView } from "@/features/modules/components/ModuleDashboard";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import type { Module } from "@/features/modules/types";
import { getProjectMarking, getUserProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";

type ModulePageProps = {
  params: Promise<{ moduleId: string }>;
};

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

  if (Number.isFinite(numericModuleId)) {
    try {
      const projects = await getUserProjects(user.id);
      const moduleProjects = projects.filter((project) => project.moduleId === numericModuleId);

      const markRows = await Promise.all(
        moduleProjects.map(async (project) => {
          const projectId = Number(project.id);
          if (!Number.isFinite(projectId)) {
            return [project.name, "Not available", project.archivedAt ? "Completed" : "In progress"] as [string, string, string];
          }

          try {
            const marking = await getProjectMarking(user.id, projectId);
            const mark = marking.studentMarking?.mark ?? marking.teamMarking?.mark ?? null;
            return [
              project.name,
              mark == null ? "Not yet published" : String(mark),
              mark == null ? (project.archivedAt ? "Completed" : "In progress") : "Published",
            ] as [string, string, string];
          } catch {
            return [
              project.name,
              "Not available",
              project.archivedAt ? "Completed" : "In progress",
            ] as [string, string, string];
          }
        }),
      );

      marksRows = markRows;
    } catch {
      marksRows = [];
    }
  }

  const dashboard = buildModuleDashboardData(module, marksRows);

  return <ModuleDashboardPageView dashboard={dashboard} />;
}
