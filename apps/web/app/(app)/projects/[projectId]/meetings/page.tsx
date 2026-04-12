import { MeetingsPageContent } from "@/features/meetings/components/MeetingsPageContent";
import { CustomAllocationWaitingBoard } from "@/features/projects/components/CustomAllocationWaitingBoard";
import { getProject, getProjectDeadline, getProjectMarking, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { PageSection } from "@/shared/ui/PageSection";
import { redirectOnUnauthorized } from "@/shared/auth/redirectOnUnauthorized";
import { resolveProjectMarkValue, resolveProjectWorkflowState } from "@/features/projects/lib/projectWorkflowState";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProjectMeetingsPage({ params, searchParams }: ProjectPageProps) {
  const { projectId } = await params;
  const { tab } = await searchParams;
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
  let isCustomAllocation = false;
  if (user && !Number.isNaN(numericProjectId)) {
    try {
      const [project, deadline, marking] = await Promise.all([
        getProject(projectId),
        getProjectDeadline(user.id, numericProjectId),
        getProjectMarking(user.id, numericProjectId).catch((error) => {
          redirectOnUnauthorized(error);
          return null;
        }),
      ]);
      isCustomAllocation = Boolean(project.teamAllocationQuestionnaireTemplateId);
      const workflowState = resolveProjectWorkflowState({
        project,
        deadline,
        markValue: resolveProjectMarkValue(marking),
      });
      projectCompleted = workflowState === "completed_unmarked" || workflowState === "completed_marked";
    } catch (error) {
      redirectOnUnauthorized(error);
      projectCompleted = false;
    }
  }

  if (!team && isCustomAllocation) {
    return (
      <PageSection title="Meetings" className="ui-page--project">
        <CustomAllocationWaitingBoard projectId={projectId} />
      </PageSection>
    );
  }

  if (team) {
    return (
      <PageSection
        title="Meetings"
        description="Schedule, review, and manage meetings for your project team."
        className="ui-page--project"
      >
        <MeetingsPageContent
          teamId={team.id}
          projectId={numericProjectId}
          projectCompleted={projectCompleted}
          initialTab={tab === "previous" ? "previous" : "upcoming"}
        />
      </PageSection>
    );
  }

  return (
    <PageSection title="Meetings" className="ui-page--project">
      <p>You are not in a team for this project.</p>
    </PageSection>
  );
}
