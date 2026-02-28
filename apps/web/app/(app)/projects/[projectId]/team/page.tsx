import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { ProjectTeamList } from "@/features/projects/components/ProjectTeamList";
import { Card } from "@/shared/ui/Card";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const team = await getTeamByUserAndProject(4, numericProjectId);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <ProjectNav projectId={projectId} />
      <div style={{ padding: 20 }}>
        <Card title={`Project Team${team.teamName ? ` - ${team.teamName}` : ""}`}>
          <ProjectTeamList team={team} />
        </Card>
      </div>
    </div>
  );
}
