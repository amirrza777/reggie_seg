import { redirect } from "next/navigation";
import { ModuleMarksSection } from "@/features/modules/components/ModuleDashboardSections";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleMarksPage({ params }: PageProps) {
  const { moduleId } = await params;
  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const { marksRows } = buildModuleDashboardData(ctx.module);

  return (
    <div className="stack module-dashboard">
      <header className="module-workspace__section-header">
        <h2 className="overview-title">Marks</h2>
        <p className="muted module-workspace__section-note">
          Snapshot of recorded and in-progress marks for this module (illustrative where the API does not yet expose live
          grades).
        </p>
      </header>
      <ModuleMarksSection marksRows={marksRows} />
    </div>
  );
}
