import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { TeamFormationPanel } from "@/features/projects/components/TeamFormationPanel";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";
import { apiFetch } from "@/shared/api/http";
import type { TeamInvite } from "@/features/projects/api/teamAllocation";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

async function getTeamInvites(teamId: number): Promise<TeamInvite[]> {
  try {
    return await apiFetch<TeamInvite[]>(`/team-allocation/teams/${teamId}/invites`);
  } catch {
    return [];
  }
}

export default async function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  if (user && !Number.isNaN(numericProjectId)) {
    try {
      team = await getTeamByUserAndProject(user.id, numericProjectId);
    } catch {
      team = null;
    }
  }

  const initialInvites = team ? await getTeamInvites(team.id) : [];

  const cardTitle = team
    ? `Project Team${team.teamName ? ` — ${team.teamName}` : ""}`
    : "Team Formation";

  return (
    <div className="stack stack--tabbed" style={{ gap: 16 }}>
      <ProjectNav projectId={projectId} />
      <div style={{ padding: 20 }}>
        <Card title={cardTitle}>
          {user ? (
            <TeamFormationPanel
              team={team}
              projectId={numericProjectId}
              userId={user.id}
              initialInvites={initialInvites}
            />
          ) : (
            <p>Please sign in to manage your team.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
