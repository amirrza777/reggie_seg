import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleDashboardPageView } from "@/features/modules/components/ModuleDashboard";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import { resolveStaffModuleWorkspaceAccess } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleOverviewPage({ params }: PageProps) {
  const { moduleId } = await params;

  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const access = resolveStaffModuleWorkspaceAccess(ctx);
  const dashboard = buildModuleDashboardData(ctx.module);
  const enc = encodeURIComponent(moduleId);

  const toolbar =
    access.staffModuleSetup || access.enterpriseModuleEditor ? (
      <>
        {access.staffModuleSetup ? (
          <Link href={`/staff/modules/${enc}/manage`} className="btn btn--primary btn--sm">
            Edit module overview
          </Link>
        ) : null}
        {access.enterpriseModuleEditor ? (
          <Link href={`/enterprise/modules/${enc}/edit`} className="btn btn--ghost btn--sm">
            Edit via enterprise console
          </Link>
        ) : null}
      </>
    ) : null;

  return <ModuleDashboardPageView dashboard={dashboard} />;
}