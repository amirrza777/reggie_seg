import { GithubProjectReposClient } from "@/features/github/components/repos/GithubProjectReposClient";
import { getProject, getTeamByUserAndProject } from "@/features/projects/api/client";
import { CustomAllocationWaitingBoard } from "@/features/projects/components/CustomAllocationWaitingBoard";
import { getCurrentUser } from "@/shared/auth/session";
import Link from "next/link";
import { PageSection } from "@/shared/ui/PageSection";
import { redirectOnUnauthorized } from "@/shared/auth/redirectOnUnauthorized";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <PageSection title="Repositories" className="ui-page--project">
        <p>Please sign in to view repository details for this project.</p>
        <Link href="/login">Go to login</Link>
      </PageSection>
    );
  }

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  try {
    team = await getTeamByUserAndProject(user.id, numericProjectId);
  } catch (error) {
    redirectOnUnauthorized(error);
    team = null;
  }

  let isCustomAllocation = false;
  try {
    const project = await getProject(projectId);
    isCustomAllocation = Boolean(project.teamAllocationQuestionnaireTemplateId);
  } catch (error) {
    redirectOnUnauthorized(error);
    isCustomAllocation = false;
  }

  if (!team && isCustomAllocation) {
    return (
      <PageSection title="Repositories" className="ui-page--project">
        <CustomAllocationWaitingBoard projectId={projectId} />
      </PageSection>
    );
  }

  return <GithubProjectReposClient projectId={projectId} />;
}
