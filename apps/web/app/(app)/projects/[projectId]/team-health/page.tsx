import Link from "next/link";
import { getCurrentUser } from "@/shared/auth/session";
import { getMyTeamHealthMessages, getMyTeamWarnings, getTeamByUserAndProject } from "@/features/projects/api/client";
import { ProjectTeamHealthPanels } from "@/features/projects/components/ProjectTeamHealthPanels";
import { ProjectTeamHealthTitleWithInfo } from "@/features/projects/components/ProjectTeamHealthTitleWithInfo";
import type { TeamHealthMessage, TeamWarning } from "@/features/projects/types";
import { PageSection } from "@/shared/ui/PageSection";

type ProjectTeamHealthPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTeamHealthPage({ params }: ProjectTeamHealthPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <p>Please sign in to submit a team health message.</p>
        <Link href="/login">Go to login</Link>
      </div>
    );
  }

  if (Number.isNaN(numericProjectId)) {
    return (
      <div style={{ padding: 24 }}>
        <p>Invalid project ID.</p>
        <Link href="/projects">Back to projects</Link>
      </div>
    );
  }

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  try {
    team = await getTeamByUserAndProject(user.id, numericProjectId);
  } catch {
    team = null;
  }

  if (!team) {
    return (
      <div style={{ padding: 24 }}>
        <p>You are not in a team for this project.</p>
        <Link href={`/projects/${projectId}`}>Back to project overview</Link>
      </div>
    );
  }

  let initialRequests: TeamHealthMessage[] = [];
  let initialWarnings: TeamWarning[] = [];
  let loadError: string | null = null;
  let warningsLoadError: string | null = null;

  const [messagesResult, warningsResult] = await Promise.allSettled([
    getMyTeamHealthMessages(numericProjectId, user.id),
    getMyTeamWarnings(numericProjectId, user.id),
  ]);

  if (messagesResult.status === "fulfilled") {
    initialRequests = messagesResult.value;
  } else {
    loadError = messagesResult.reason instanceof Error
      ? messagesResult.reason.message
      : "Failed to load existing team health messages.";
  }

  if (warningsResult.status === "fulfilled") {
    initialWarnings = warningsResult.value;
  } else {
    warningsLoadError = warningsResult.reason instanceof Error
      ? warningsResult.reason.message
      : "Failed to load team warnings.";
  }

  const activeWarnings = initialWarnings.filter((warning) => warning.active);

  return (
    <PageSection
      title={<ProjectTeamHealthTitleWithInfo title="Team Health" />}
      description="View active warnings and submit team health messages."
      className="ui-page--project"
    >
      <ProjectTeamHealthPanels
        projectId={numericProjectId}
        userId={user.id}
        initialRequests={initialRequests}
        activeWarnings={activeWarnings}
        messagesLoadError={loadError}
        warningsLoadError={warningsLoadError}
      />
    </PageSection>
  );
}
