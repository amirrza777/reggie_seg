import { redirect } from "next/navigation";
import { CommitList } from "@/features/repos/components/CommitList";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { RepoLinkForm } from "@/features/repos/components/RepoLinkForm";
import { Placeholder } from "@/shared/ui/Placeholder";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const flagMap = await getFeatureFlagMap();
  if (!flagMap["repos"]) redirect(`/projects/${projectId}`);

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <Placeholder title="Repos" path={`/projects/${projectId}/repos`} description="Link repositories for this project." />
      <RepoLinkForm projectId={projectId} />
      <CommitList />
    </div>
  );
}
