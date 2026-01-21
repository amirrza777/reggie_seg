import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectOverviewPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <Placeholder
      title="Project overview"
      path={`/projects/${projectId}`}
      description={`Landing view for project ${projectId}.`}
    />
  );
}
