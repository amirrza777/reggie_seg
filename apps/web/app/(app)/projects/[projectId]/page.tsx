import { Placeholder } from "@/shared/ui/Placeholder";
import { ProjectNav } from "@/src/features/projects/components/ProjectNav";
import { ProjectOverview } from "@/src/features/projects/components/ProjectOverview";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectOverviewPage({ params }: ProjectPageProps) {
  const { projectId } = params;
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
