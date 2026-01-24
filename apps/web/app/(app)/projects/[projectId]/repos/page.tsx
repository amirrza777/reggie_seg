import { Placeholder } from "@/shared/ui/Placeholder";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { RepoLinkForm } from "@/features/repos/components/RepoLinkForm";
import { CommitList } from "@/features/repos/components/CommitList";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = params;
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
