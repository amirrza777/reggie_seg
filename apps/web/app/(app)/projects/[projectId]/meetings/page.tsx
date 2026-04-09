import { MeetingsPageContent } from "@/features/meetings/components/MeetingsPageContent";
import { CustomAllocationWaitingBoard } from "@/features/projects/components/CustomAllocationWaitingBoard";
import { getProject, getProjectDeadline, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { PageSection } from "@/shared/ui/PageSection";

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
    } catch {
      team = null;
    }
  }

  let projectCompleted = false;
  let isCustomAllocation = false;
  if (user && !Number.isNaN(numericProjectId)) {
    try {
      const [project, deadline] = await Promise.all([
        getProject(projectId),
        getProjectDeadline(user.id, numericProjectId),
      ]);
      isCustomAllocation = Boolean(project.teamAllocationQuestionnaireTemplateId);
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
