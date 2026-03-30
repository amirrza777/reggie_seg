/* eslint-disable react-refresh/only-export-components */
import { DiscussionForumClient } from "@/features/forum/components/DiscussionForumClient";
import { getProject, getTeamByUserAndProject } from "@/features/projects/api/client";
import { CustomAllocationWaitingBoard } from "@/features/projects/components/CustomAllocationWaitingBoard";
import { getCurrentUser } from "@/shared/auth/session";
import { PageSection } from "@/shared/ui/PageSection";

export const metadata = { title: "Discussion Forum" };

type ProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDiscussionPage({ params }: ProjectDiscussionPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();
  let shouldShowCustomAllocationBoard = false;

  if (user && !Number.isNaN(numericProjectId)) {
    let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
    try {
      team = await getTeamByUserAndProject(user.id, numericProjectId);
    } catch {
      team = null;
    }

    if (!team) {
      try {
        const project = await getProject(projectId);
        if (project.teamAllocationQuestionnaireTemplateId) {
          shouldShowCustomAllocationBoard = true;
        }
      } catch {
        // Fall through to the standard client rendering.
      }
    }
  }

  if (shouldShowCustomAllocationBoard) {
    return (
      <PageSection title="Discussion forum" className="ui-page--project">
        <CustomAllocationWaitingBoard projectId={projectId} />
      </PageSection>
    );
  }

  return (
    <DiscussionForumClient projectId={projectId} />
  );
}
