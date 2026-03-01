import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { ProjectTrelloContent } from "@/features/trello/components/ProjectTrelloContent";
import { getCurrentUser } from "@/shared/auth/session";
import Link from "next/link";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTrelloPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;

  if (user) {
    try {
      team = await getTeamByUserAndProject(user.id, Number(projectId));
    } catch {
      team = null;
    }
  }

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      {!user ? (
        <div style={{ padding: 24 }}>
          <p>Please sign in to view Trello for this project.</p>
          <Link href={`/projects/${projectId}`}>← Back to project</Link>
        </div>
      ) : team ? (
        <ProjectTrelloContent
          projectId={projectId}
          teamId={team.id}
          teamName={team.teamName}
        />
      ) : (
        <div style={{ padding: 24 }}>
          <p>You are not in a team for this project.</p>
          <Link href={`/projects/${projectId}`}>← Back to project</Link>
        </div>
      )}
    </div>
  );
}

