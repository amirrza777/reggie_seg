import { GithubProjectReposClient } from "@/features/github/components/GithubProjectReposClient";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return <GithubProjectReposClient projectId={projectId} />;
}
