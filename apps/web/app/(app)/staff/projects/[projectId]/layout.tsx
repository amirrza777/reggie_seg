import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { StaffProjectBreadcrumbs } from "@/features/staff/projects/components/StaffProjectBreadcrumbs";
import { StaffProjectSectionNavGate } from "@/features/staff/projects/components/StaffProjectSectionNavGate";
import { StaffProjectsWorkspacePageHeader } from "@/features/staff/projects/components/StaffProjectsWorkspacePageHeader";
import { staffProjectWorkspaceAggregates } from "@/features/staff/projects/lib/staffProjectWorkspaceAggregates";
import { ArchivedProjectScopeBanner } from "@/features/modules/components/ArchivedProjectScopeBanner";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectLayout({ children, params }: LayoutProps) {
  const { projectId } = await params;
  const projectIdNumber = Number(projectId);

  let projectName = `Project ${projectId}`;
  let teamNamesById: Record<string, string> = {};
  let moduleId: number | null = null;
  let moduleName: string | null = null;
  let moduleArchivedAt: string | null | undefined;
  let projectArchivedAt: string | null | undefined;
  let teamCount = 0;
  let studentCount = 0;
  let accessRoleLabel = "Staff access";
  let canManageProjectSettings = false;

  const user = await getCurrentUser();
  const canLoadProjectData =
    !Number.isNaN(projectIdNumber) &&
    (user?.isStaff || user?.role === "ADMIN");

  if (canLoadProjectData && user) {
    try {
      const projectData = await getStaffProjectTeams(user.id, projectIdNumber);
      projectName = projectData.project.name;
      moduleId = projectData.project.moduleId;
      moduleName = projectData.project.moduleName;
      moduleArchivedAt = projectData.project.moduleArchivedAt ?? null;
      projectArchivedAt = projectData.project.projectArchivedAt ?? null;
      teamNamesById = Object.fromEntries(projectData.teams.map((team) => [String(team.id), team.teamName]));
      const aggregates = staffProjectWorkspaceAggregates(projectData);
      teamCount = aggregates.teamCount;
      studentCount = aggregates.studentCount;
      accessRoleLabel = aggregates.accessRoleLabel;
      canManageProjectSettings = projectData.project.canManageProjectSettings === true;
    } catch {
      // Keep fallback breadcrumb labels when project data fails to load.
    }
  }

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
        teamCount={teamCount}
        studentCount={studentCount}
        accessRoleLabel={accessRoleLabel}
      />
      {children}
    </div>
  );
}
