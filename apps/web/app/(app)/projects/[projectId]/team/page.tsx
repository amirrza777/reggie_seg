import { getProject, getProjectDeadline, getTeamByUserAndProject } from "@/features/projects/api/client";
import { TeamFormationPanel } from "@/features/projects/components/TeamFormationPanel";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";
import { apiFetch } from "@/shared/api/http";
import type { TeamInvite } from "@/features/projects/api/teamAllocation";
import { PageSection } from "@/shared/ui/PageSection";

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

  let projectCompleted = false;
  if (user && !Number.isNaN(numericProjectId)) {
    try {
      const [project, deadline] = await Promise.all([
        getProject(projectId),
        getProjectDeadline(user.id, numericProjectId),
      ]);
      const feedbackDueDate = deadline.feedbackDueDate ? new Date(deadline.feedbackDueDate) : null;
      const now = new Date();
      const feedbackDueDatePassed = feedbackDueDate
        ? !Number.isNaN(feedbackDueDate.getTime()) && feedbackDueDate.getTime() < now.getTime()
        : false;
      projectCompleted = Boolean(project.archivedAt) || feedbackDueDatePassed;
    } catch {
      projectCompleted = false;
    }
  }

  const initialInvites = team && !projectCompleted ? await getTeamInvites(team.id) : [];

  const pageTitle = team?.teamName ? `Team - ${team.teamName}` : "Team";

  return (
    <PageSection
      title={pageTitle}
      description="Manage teammates and invitations for this project."
      className="ui-page--project"
    >
      <Card>
        {user ? (
          <TeamFormationPanel
            team={team}
            projectId={numericProjectId}
            initialInvites={initialInvites}
            projectCompleted={projectCompleted}
          />
        ) : (
          <p className="ui-note ui-note--muted">Please sign in to manage your team.</p>
        )}
      </Card>
    </PageSection>
  );
}
