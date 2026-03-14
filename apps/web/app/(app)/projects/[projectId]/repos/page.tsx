import { GithubProjectReposClient } from "@/features/github/components/GithubProjectReposClient";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getProjectNavFlags } from "@/features/projects/navFlags";
import { getCurrentUser } from "@/shared/auth/session";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();
  const navFlags = await getProjectNavFlags(user?.id, numericProjectId);

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={navFlags} />
      <GithubProjectReposClient projectId={projectId} />
    </div>
  );
}
