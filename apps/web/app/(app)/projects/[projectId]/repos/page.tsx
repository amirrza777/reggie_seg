import { CommitList } from "@/features/repos/components/CommitList";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { RepoLinkForm } from "@/features/repos/components/RepoLinkForm";
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
        description="Link repositories for this project."
      />
      <RepoLinkForm projectId={projectId} />
      <CommitList />
    </div>
  );
}
