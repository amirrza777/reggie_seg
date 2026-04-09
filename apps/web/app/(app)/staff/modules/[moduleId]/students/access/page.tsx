// STAFF | manually edit which students are enrolled in a module

import { redirect } from "next/navigation";
import { StaffModuleStudentAccessForm } from "@/features/modules/components/moduleSetup/StaffModuleStudentAccessForm";
import { loadModuleSetupInitialSelection } from "@/features/modules/lib/moduleSetupInitialSelection";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleStudentAccessPage({ params }: PageProps) {
  const { moduleId } = await params;
  const modId = encodeURIComponent(moduleId);

  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const access = resolveStaffModuleWorkspaceAccess(ctx);
  if (!access.staffModuleSetup) {
    redirect(`/staff/modules/${modId}/students`);
  }
  if (!access.canEdit) {
    redirect(`/staff/modules/${modId}/students`);
  }

  const parsed = ctx.parsedModuleId;
  const { moduleRecord } = ctx;
  if (!moduleRecord) {
    redirect(`/staff/modules/${modId}/students`);
  }

  const initialAccessSelection = await loadModuleSetupInitialSelection(parsed, moduleRecord);
  if (!initialAccessSelection) {
    redirect(`/staff/modules/${modId}/students`);
  }

  return (
    <StaffModuleStudentAccessForm
      moduleId={parsed}
      initialAccessSelection={initialAccessSelection}
      variant="page"
    />
  );
}
