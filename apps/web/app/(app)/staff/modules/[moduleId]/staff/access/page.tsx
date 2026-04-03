import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffModuleAccessForm } from "@/features/modules/components/moduleSetup/StaffModuleAccessForm";
import { loadModuleSetupInitialSelection } from "@/features/modules/lib/moduleSetupInitialSelection";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import { Card } from "@/shared/ui/Card";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleStaffAccessPage({ params }: PageProps) {
  const { moduleId } = await params;
  const modId = encodeURIComponent(moduleId);

  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const access = resolveStaffModuleWorkspaceAccess(ctx);
  if (!access.staffModuleSetup) {
    redirect(`/staff/modules/${modId}/staff`);
  }
  if (!access.canEdit) {
    redirect(`/staff/modules/${modId}/staff`);
  }

  const parsed = ctx.parsedModuleId;
  const { moduleRecord } = ctx;
  if (!moduleRecord) {
    redirect(`/staff/modules/${modId}/staff`);
  }

  const initialAccessSelection = await loadModuleSetupInitialSelection(parsed, moduleRecord);
  if (!initialAccessSelection) {
    redirect(`/staff/modules/${modId}/staff`);
  }

  return (
    <div className="ui-page enterprise-module-create-page">
      <Link href={`/staff/modules/${encodeURIComponent(modId)}/staff`} className="muted">
          ← Back to current staff members
        </Link>
      <Card>
        <StaffModuleAccessForm
          moduleId={parsed}
          currentUserId={ctx.user.id}
          initialAccessSelection={initialAccessSelection}
        />
      </Card>
    </div>
  );
}
