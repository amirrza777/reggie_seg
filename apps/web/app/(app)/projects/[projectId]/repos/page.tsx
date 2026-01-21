import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <Placeholder
      title="Repos"
      path={`/projects/${projectId}/repos`}
      description="Link repositories for this project."
    />
  );
}
