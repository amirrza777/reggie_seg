import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Placeholder } from "@/shared/ui/Placeholder";
import { getTeammatesInProject } from "@/features/projects/api/client";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const teammates = await getTeammatesInProject(4, Number(projectId)); 
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
