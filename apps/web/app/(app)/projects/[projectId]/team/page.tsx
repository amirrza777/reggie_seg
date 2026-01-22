import { Placeholder } from "@/shared/ui/Placeholder";
import { ProjectNav } from "@/src/features/projects/components/ProjectNav";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <Placeholder
        title="Project team"
        path={`/projects/${projectId}/team`}
        description="Manage team members and roles."
      />
    </div>
  );
}
