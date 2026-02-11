import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
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
