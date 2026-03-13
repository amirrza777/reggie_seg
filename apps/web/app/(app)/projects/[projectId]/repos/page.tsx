import { GithubProjectReposClient } from "@/features/github/components/GithubProjectReposClient";
import { ProjectNav } from "@/features/projects/components/ProjectNav";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} />
      <GithubProjectReposClient projectId={projectId} />
    </div>
  );
}
