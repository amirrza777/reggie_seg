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
      <GithubProjectReposClient projectId={projectId} />
    </div>
  );
}
