import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleDashboardPageView } from "@/features/modules/components/dashboard/ModuleDashboard";
import { buildModuleProjectDeadlineTimelineRows } from "@/features/modules/lib/moduleProjectDeadlineTimeline";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import { getProjectDeadline, getStaffProjects } from "@/features/projects/api/client";
import type { ProjectDeadline } from "@/features/projects/types";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleOverviewPage({ params }: PageProps) {
  const { moduleId } = await params;

  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const access = resolveStaffModuleWorkspaceAccess(ctx);
  let projectDeadlines: Array<{ projectName: string; deadline: ProjectDeadline | null }> = [];
  try {
    const projects = await getStaffProjects(ctx.user.id, { moduleId: ctx.parsedModuleId });
    projectDeadlines = await Promise.all(
      projects.map(async (project) => {
        try {
          const deadline = await getProjectDeadline(ctx.user.id, project.id);
          return { projectName: project.name, deadline };
        } catch {
          return { projectName: project.name, deadline: null };
        }
      }),
    );
  } catch {
    projectDeadlines = [];
  }

  const dashboard = {
    ...buildModuleDashboardData(ctx.module),
    timelineRows: buildModuleProjectDeadlineTimelineRows(projectDeadlines),
  };
  const enc = encodeURIComponent(moduleId);

  const toolbar = access.canEdit ? (
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

  return <ModuleDashboardPageView dashboard={dashboard} toolbar={toolbar} />;
}
