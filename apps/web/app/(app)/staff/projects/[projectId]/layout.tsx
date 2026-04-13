import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { StaffProjectBreadcrumbs } from "@/features/staff/projects/components/navigation/StaffProjectBreadcrumbs";
import { StaffProjectSectionNavGate } from "@/features/staff/projects/components/navigation/StaffProjectSectionNavGate";
import { StaffProjectsWorkspacePageHeader } from "@/features/staff/projects/components/StaffProjectsWorkspacePageHeader";
import { staffProjectWorkspaceAggregates } from "@/features/staff/projects/lib/staffProjectWorkspaceAggregates";
import { ArchivedProjectScopeBanner } from "@/features/modules/components/ArchivedProjectScopeBanner";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectLayout({ children, params }: LayoutProps) {
  const { projectId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.isStaff && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) {
    redirect("/staff/modules");
  }

  let projectData;
  try {
    projectData = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 403) {
      redirect(`/staff/projects/${encodeURIComponent(projectId)}`);
    }
    if (e instanceof ApiError && e.status === 404) {
      redirect("/staff/modules");
    }
    throw e;
  }

  const projectName = projectData.project.name;
  const moduleId = projectData.project.moduleId;
  const moduleName = projectData.project.moduleName;
  const moduleArchivedAt = projectData.project.moduleArchivedAt ?? null;
  const projectArchivedAt = projectData.project.projectArchivedAt ?? null;
  const teamNamesById = Object.fromEntries(projectData.teams.map((team) => [String(team.id), team.teamName]));
  const aggregates = staffProjectWorkspaceAggregates(projectData);
  const canManageProjectSettings = projectData.project.canManageProjectSettings === true;

  return (
    <div className="stack staff-projects__panel-shell">
      <StaffProjectBreadcrumbs
        projectId={projectId}
        projectName={projectName}
        teamNamesById={teamNamesById}
        moduleId={moduleId != null ? String(moduleId) : null}
        moduleName={moduleName}
      />
      <ArchivedProjectScopeBanner
        moduleArchivedAt={moduleArchivedAt}
        projectArchivedAt={projectArchivedAt}
        audience="staff"
        projectId={projectId}
      />
      <StaffProjectSectionNavGate
        projectId={projectId}
        moduleId={moduleId}
        canManageProjectSettings={canManageProjectSettings}
      />
      <StaffProjectsWorkspacePageHeader
        title={projectName}
        teamCount={aggregates.teamCount}
        studentCount={aggregates.studentCount}
        accessRoleLabel={aggregates.accessRoleLabel}
      />
      {children}
    </div>
  );
}
