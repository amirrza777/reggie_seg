import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ModuleExpectationsSection,
  ModuleSummaryCard,
} from "@/features/modules/components/ModuleDashboardSections";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import { resolveStaffModuleWorkspaceAccess } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";

type PageProps = {
  params: Promise<{ moduleId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function StaffModuleExpectationsPage({ params, searchParams }: PageProps) {
  const { moduleId } = await params;

  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const { module } = ctx;
  const access = resolveStaffModuleWorkspaceAccess(ctx);
  const {
    moduleCode,
    teamCount,
    projectCount,
    hasLinkedProjects,
    projectPlans,
    timelineRows,
    expectationRows,
    briefParagraphs,
    readinessParagraphs,
  } = buildModuleDashboardData(module);

  const enc = encodeURIComponent(moduleId);
  return (
    <div className="stack module-dashboard">
      <h2 className="overview-title">Expectations &amp; guidance</h2>
      <p className="muted">
        Module brief, timeline, assessment expectations, and readiness notes for students and staff.
      </p>

      {access.staffModuleSetup || access.enterpriseModuleEditor ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {access.staffModuleSetup ? (
            <Link href={`/staff/modules/${enc}/manage`} className="btn btn--primary btn--sm">
              Edit module overview
            </Link>
          ) : null}
          {access.enterpriseModuleEditor ? (
            <Link href={`/enterprise/modules/${enc}/edit`} className="btn btn--ghost btn--sm">
              Enterprise console
            </Link>
          ) : null}
        </div>
      ) : null}

      <ModuleSummaryCard
        title={module.title}
        moduleCode={moduleCode}
        teamCount={teamCount}
        projectCount={projectCount}
        hasLinkedProjects={hasLinkedProjects}
        projectPlans={projectPlans}
      />

      <ModuleExpectationsSection
        briefParagraphs={briefParagraphs}
        projectPlans={projectPlans}
        timelineRows={timelineRows}
        expectationRows={expectationRows}
        readinessParagraphs={readinessParagraphs}
      />
    </div>
  );
}
