import { GithubProjectReposClient } from "@/features/github/components/GithubProjectReposClient";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <Placeholder
        title="Repos"
        path={`/projects/${projectId}/repos`}
        description="Connect your GitHub account and view repositories linked to this project."
      />
      <GithubProjectReposClient projectId={projectId} />
    </div>
  );
}
