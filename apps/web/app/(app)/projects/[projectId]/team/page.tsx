import {
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getTeamAllocationQuestionnaireStatusForProject,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import { TeamFormationPanel } from "@/features/projects/components/TeamFormationPanel";
import { TeamAllocationQuestionnaireCard } from "@/features/projects/components/TeamAllocationQuestionnaireCard";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";
import { apiFetch } from "@/shared/api/http";
import type { TeamInvite } from "@/features/projects/api/teamAllocation";
import { PageSection } from "@/shared/ui/PageSection";
import type { TeamAllocationQuestionnaireStatus } from "@/features/projects/types";
import { redirectOnUnauthorized } from "@/shared/auth/redirectOnUnauthorized";
import { resolveProjectMarkValue, resolveProjectWorkflowState } from "@/features/projects/lib/projectWorkflowState";
import { resolveStudentTeamFormationMode } from "@/features/projects/lib/teamFormationMode";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

async function getTeamInvites(teamId: number): Promise<TeamInvite[]> {
  try {
    return await apiFetch<TeamInvite[]>(`/team-allocation/teams/${teamId}/invites`);
  } catch (error) {
    redirectOnUnauthorized(error);
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
    } catch (error) {
      redirectOnUnauthorized(error);
      team = null;
    }
  }

  let projectCompleted = false;
  let project: Awaited<ReturnType<typeof getProject>> | null = null;
  let projectDeadline: Awaited<ReturnType<typeof getProjectDeadline>> | null = null;
  if (user && !Number.isNaN(numericProjectId)) {
    try {
      const [projectRecord, deadline, marking] = await Promise.all([
        getProject(projectId),
        getProjectDeadline(user.id, numericProjectId),
        getProjectMarking(user.id, numericProjectId).catch((error) => {
          redirectOnUnauthorized(error);
          return null;
        }),
      ]);
      project = projectRecord;
      projectDeadline = deadline;
      const workflowState = resolveProjectWorkflowState({
        project: projectRecord,
        deadline,
        markValue: resolveProjectMarkValue(marking),
      });
      projectCompleted = workflowState === "completed_unmarked" || workflowState === "completed_marked";
    } catch (error) {
      redirectOnUnauthorized(error);
      projectCompleted = false;
    }
  }

  const initialInvites = team && !projectCompleted ? await getTeamInvites(team.id) : [];

  const pageTitle = team?.teamName ? `Team - ${team.teamName}` : "Team";
  const teamFormationMode = projectCompleted ? "staff" : resolveStudentTeamFormationMode(project);
  const shouldRenderTeamPanel =
    !user ||
    Boolean(team) ||
    teamFormationMode === "self" ||
    teamFormationMode === "staff";
  let teamAllocationQuestionnaireStatus: TeamAllocationQuestionnaireStatus | null = null;

  if (user && !team && teamFormationMode === "custom" && project?.teamAllocationQuestionnaireTemplateId) {
    try {
      teamAllocationQuestionnaireStatus = await getTeamAllocationQuestionnaireStatusForProject(numericProjectId);
    } catch (error) {
      redirectOnUnauthorized(error);
      teamAllocationQuestionnaireStatus = null;
    }
  }

  return (
    <PageSection
      title={pageTitle}
      description="Manage teammates and invitations for this project."
      className="ui-page--project"
    >
      {teamFormationMode === "custom" && !team && user ? (
        teamAllocationQuestionnaireStatus ? (
          teamAllocationQuestionnaireStatus.hasSubmitted || teamAllocationQuestionnaireStatus.windowIsOpen ? (
          <TeamAllocationQuestionnaireCard
            projectId={numericProjectId}
            currentUserId={user.id}
            questionnaire={teamAllocationQuestionnaireStatus.questionnaireTemplate}
            initialSubmitted={teamAllocationQuestionnaireStatus.hasSubmitted}
          />
          ) : (
            <Card title="Team allocation">
              <p>Please wait for staff to add you to a team for this project.</p>
            </Card>
          )
        ) : (
          <Card title="Team allocation questionnaire">
            <p>Allocation questionnaire is not available right now. Please try again shortly.</p>
          </Card>
        )
      ) : null}

      {shouldRenderTeamPanel ? (
        <Card>
          {user ? (
            <TeamFormationPanel
              team={team}
              projectId={numericProjectId}
              userId={user.id}
              initialInvites={initialInvites}
              projectCompleted={projectCompleted}
              teamFormationMode={teamFormationMode}
            />
          ) : (
            <p>Please sign in to manage your team.</p>
          )}
        </Card>
      ) : null}
    </PageSection>
  );
}
