import Link from "next/link";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { StaffTeamPageHeader } from "@/features/staff/projects/components/StaffTeamPageHeader";
import { TeamSectionSubtitle } from "@/features/staff/projects/components/TeamSectionSubtitle";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";

import "@/features/staff/projects/styles/staff-projects.css";

type LayoutProps = {
  params: Promise<{ projectId: string; teamId: string }>;
  children: React.ReactNode;
};

export default async function StaffTeamLayout({ params, children }: LayoutProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return (
      <div className="staff-projects">
        <div className="stack">
          <p className="muted">{ctx.error}</p>
          <Link
            href={`/staff/projects/${projectId}`}
            className="pill-nav__link"
            style={{ width: "fit-content" }}
          >
            Back to project teams
          </Link>
        </div>
      </div>
    );
  }

  const { project, team } = ctx;

  return (
    <div className="staff-projects">
      <StaffTeamPageHeader
        project={{ id: project.id, name: project.name, moduleId: project.moduleId, moduleName: project.moduleName }}
        team={team}
        subtitle={<TeamSectionSubtitle />}
      />
      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />
      {children}
    </div>
  );
}
