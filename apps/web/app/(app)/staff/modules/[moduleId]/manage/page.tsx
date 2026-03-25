import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleGuidanceSection } from "@/features/modules/components/moduleSetup/ModuleGuidanceSection";
import { loadModuleSetupInitialSelection } from "@/features/modules/lib/moduleSetupInitialSelection";
import { canOpenStaffModuleManagePage } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";
import { Card } from "@/shared/ui/Card";

type StaffModuleManagePageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleManagePage({ params }: StaffModuleManagePageProps) {
  const { moduleId } = await params;
  const modId = encodeURIComponent(moduleId);

  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  if (!canOpenStaffModuleManagePage(ctx)) {
    redirect(`/staff/modules/${modId}`);
  }

  const { parsedModuleId: moduleNumericId, moduleRecord } = ctx;
  if (!moduleRecord) redirect(`/staff/modules/${modId}`);

  const initialAccessSelection = await loadModuleSetupInitialSelection(moduleNumericId, moduleRecord);
  if (!initialAccessSelection) {
    redirect(`/staff/modules/${modId}`);
  }

  return (
    <div className="ui-page enterprise-module-create-page">
      <header className="ui-page__header">
        <h2 className="overview-title ui-page__title">Manage module</h2>
        <p className="ui-page__description">
          Update the module overview details and guidance.
        </p>
      </header>
      <Card
        title={<span className="overview-title">Module setup</span>}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/staff/projects/create?moduleId=${encodeURIComponent(String(moduleNumericId))}`}
              className="btn btn--primary"
            >
              Create project
            </Link>
            <Link href={`/staff/modules/${modId}/projects`} className="btn btn--ghost">
              Projects &amp; teams
            </Link>
            <Link href="/staff/modules" className="btn btn--ghost">
              Back to my modules
            </Link>
          </div>
        }
        className="enterprise-module-create__card"
      >
        <ModuleGuidanceSection
          moduleId={moduleNumericId}
          initialAccessSelection={initialAccessSelection}
          staffModuleRow={moduleRecord}
        />
      </Card>
    </div>
  );
}
