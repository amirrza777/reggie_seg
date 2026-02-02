import { ProjectOverview } from "@/features/projects/components/ProjectOverview";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectOverviewPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <Placeholder
        title="Project overview"
        path={`/projects/${projectId}`}
        description={`Landing view for project ${projectId}.`}
      />
      <ProjectOverview />
    </div>
  );
}
