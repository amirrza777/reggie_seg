import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleExpectationsSection } from "@/features/modules/components/ModuleDashboardSections";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import { resolveStaffModuleWorkspaceAccess } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleExpectationsPage({ params }: PageProps) {
  const { moduleId } = await params;

  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const access = resolveStaffModuleWorkspaceAccess(ctx);
  const {
    projectPlans,
    timelineRows,
    expectationRows,
    briefParagraphs,
    readinessParagraphs,
  } = buildModuleDashboardData(ctx.module);

  const enc = encodeURIComponent(moduleId);
  return (
    <div className="stack module-dashboard">
      <header className="module-workspace__section-header module-workspace__section-header--expectations">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <h2 className="overview-title" style={{ margin: 0 }}>
            Expectations &amp; guidance
          </h2>
          {access.staffModuleSetup || access.enterpriseModuleEditor ? (
            <div className="module-workspace__section-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
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
        </div>
        <p className="muted module-workspace__section-note" style={{ margin: "8px 0 0" }}>
          Module brief, timeline, assessment expectations, and readiness notes for students and staff.
        </p>
      </header>

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
