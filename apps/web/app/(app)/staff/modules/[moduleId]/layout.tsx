import { redirect } from "next/navigation";
import { ModuleWorkspaceNav } from "@/features/modules/components/ModuleWorkspaceNav";
import { StaffModuleWorkspaceArchivedBanner } from "@/features/modules/components/StaffModuleWorkspaceArchivedBanner";
import { StaffModuleWorkspaceBreadcrumbs } from "@/features/modules/components/StaffModuleWorkspaceBreadcrumbs";
import { StaffModuleWorkspaceHero } from "@/features/modules/components/StaffModuleWorkspaceHero";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import { getCurrentUser } from "@/shared/auth/session";

type LayoutProps = {
  params: Promise<{ moduleId: string }>;
  children: React.ReactNode;
};

export default async function StaffModuleWorkspaceLayout({ params, children }: LayoutProps) {
  const { moduleId } = await params;
  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    redirect("/staff/modules");
  }

  const access = resolveStaffModuleWorkspaceAccess(ctx);

  return (
    <div className="staff-projects staff-projects__panel-shell module-workspace module-workspace--staff">
      <div className="stack module-workspace__content">
        <StaffModuleWorkspaceBreadcrumbs moduleId={moduleId} moduleTitle={ctx.module.title} />
        <ModuleWorkspaceNav moduleId={moduleId} basePath="/staff/modules" />
        <StaffModuleWorkspaceHero ctx={ctx} className="module-workspace__hero" isArchived={access.isArchived} />
        {access.isArchived ? <StaffModuleWorkspaceArchivedBanner /> : null}
        {children}
      </div>
    </div>
  );
}
