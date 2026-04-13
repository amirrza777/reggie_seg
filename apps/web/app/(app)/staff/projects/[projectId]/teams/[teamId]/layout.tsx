import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/navigation/StaffTeamSectionNav";
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
        </div>
      </div>
    );
  }

  const { team } = ctx;

  return (
    <>
      <StaffTeamSectionNav projectId={projectId} teamId={teamId} moduleId={ctx.project.moduleId} />
      <div className="staff-team-layout-content">{children}</div>
    </>
  );
}
