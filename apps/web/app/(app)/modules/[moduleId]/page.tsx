import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { getUserProjects } from "@/features/projects/api/client";
import {
  ModuleExpectationsSection,
  ModuleMarksSection,
  ModuleSummaryCard,
  ModuleTabNav,
} from "@/features/modules/components/ModuleDashboardSections";
import { buildModuleDashboardData, resolveModuleDashboardTab } from "@/features/modules/moduleDashboardData";
import type { Module } from "@/features/modules/types";
import { getCurrentUser } from "@/shared/auth/session";

type ModulePageProps = {
  params: Promise<{ moduleId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function ModulePage({ params, searchParams }: ModulePageProps) {
  const { moduleId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolveModuleDashboardTab(resolvedSearchParams?.tab);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let modules: Module[] = [];
  try {
    modules = await listModules(user.id);
  } catch {
    modules = [];
  }

  let userProjects: Awaited<ReturnType<typeof getUserProjects>> = [];
  try {
    userProjects = await getUserProjects(user.id);
  } catch {
    userProjects = [];
  }

  const module = modules.find((item) => String(item.id) === moduleId);
  if (!module) notFound();

  const {
    moduleCode,
    teamCount,
    projectCount,
    hasLinkedProjects,
    marksRows,
    projectPlans,
    timelineRows,
    expectationRows,
    briefParagraphs,
    readinessParagraphs,
  } = buildModuleDashboardData(module);

  return (
    <div className="stack stack--tabbed module-dashboard">
      <ModuleTabNav moduleId={module.id} activeTab={activeTab} />

      <ModuleSummaryCard
        title={module.title}
        moduleCode={moduleCode}
        teamCount={teamCount}
        projectCount={projectCount}
        hasLinkedProjects={hasLinkedProjects}
        projectPlans={projectPlans}
      />

      {activeTab === "expectations" ? (
        <ModuleExpectationsSection
          briefParagraphs={briefParagraphs}
          projectPlans={projectPlans}
          timelineRows={timelineRows}
          expectationRows={expectationRows}
          readinessParagraphs={readinessParagraphs}
        />
      ) : (
        <ModuleMarksSection marksRows={marksRows} />
      )}
    </div>
  );
}
