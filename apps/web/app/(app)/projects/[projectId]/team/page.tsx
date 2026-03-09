import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { ProjectTeamList } from "@/features/projects/components/ProjectTeamList";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";
import Link from "next/link";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  if (user && !Number.isNaN(numericProjectId)) {
    try {
      team = await getTeamByUserAndProject(user.id, numericProjectId);
    } catch {
      team = null;
    }
  }

  return (
    <div className="stack stack--tabbed" style={{ gap: 16 }}>
      <ProjectNav projectId={projectId} />
      {team ? (
        <div style={{ padding: 20 }}>
          <Card title={`Project Team${team.teamName ? ` - ${team.teamName}` : ""}`}>
            <ProjectTeamList team={team} />
          </Card>
        </div>
      ) : (
        <div style={{ padding: 24 }}>
          <p>You are not in a team for this project.</p>
          <Link href={`/projects/${projectId}`}>← Back to project</Link>
        </div>
      )}
    </div>
  );
}
