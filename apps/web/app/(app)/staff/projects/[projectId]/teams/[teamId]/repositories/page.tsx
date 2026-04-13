import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";
import { StaffProjectReposReadOnlyClient } from "@/features/github/components/repos/StaffProjectReposReadOnlyClient";
type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffRepositoriesSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const userId = (await getCurrentUser())!.id;

  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);

  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await getStaffProjectTeams(userId, numericProjectId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load repositories.";
  }

  const team = data?.teams.find((item) => item.id === numericTeamId) ?? null;
  if (!data || !team) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Team not found in this project."}</p>
      </div>
    );
  }

  return (
    <div className="staff-projects">
      <StaffProjectReposReadOnlyClient
        projectId={projectId}
        projectName={data.project.name}
        teamName={team.teamName}
      />
    </div>
  );
}
