import { MeetingsPageContent } from "@/features/meetings/components/MeetingsPageContent";
import { getProject, getProjectDeadline, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import Link from "next/link";
import { PageSection } from "@/shared/ui/PageSection";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectMeetingsPage({ params }: ProjectPageProps) {
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

  if (team) {
    return (
      <PageSection
        title="Meetings"
        description="Schedule and view your team meetings."
        className="ui-page--project"
      >
        <MeetingsPageContent
          teamId={team.id}
          projectId={numericProjectId}
          projectCompleted={projectCompleted}
        />
      </PageSection>
    );
  }

  return (
    <PageSection title="Meetings" className="ui-page--project">
      <p>You are not in a team for this project.</p>
      <Link href={`/projects/${projectId}`}>← Back to project</Link>
    </PageSection>
  );
}
