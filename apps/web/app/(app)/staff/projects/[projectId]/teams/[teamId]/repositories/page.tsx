import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { StaffProjectReposReadOnlyClient } from "@/features/github/components/StaffProjectReposReadOnlyClient";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffRepositoriesSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  const { project, team } = ctx;

  return (
    <StaffProjectReposReadOnlyClient
      projectId={projectId}
      projectName={project.name}
      teamName={team.teamName}
    />
  );
}
