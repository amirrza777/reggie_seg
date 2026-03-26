import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { StaffProjectBreadcrumbs } from "@/features/staff/projects/components/StaffProjectBreadcrumbs";
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

  const user = await getCurrentUser();
  const canLoadProjectData =
    !Number.isNaN(projectIdNumber) &&
    (user?.isStaff || user?.role === "ADMIN");

  if (canLoadProjectData && user) {
    try {
      const projectData = await getStaffProjectTeams(user.id, projectIdNumber);
      projectName = projectData.project.name;
      teamNamesById = Object.fromEntries(projectData.teams.map((team) => [String(team.id), team.teamName]));
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
      />
      {children}
    </div>
  );
}
