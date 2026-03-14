import { MeetingSchedulerContent } from "@/features/meetings/components/MeetingSchedulerContent";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getProjectNavFlags } from "@/features/projects/navFlags";
import { getCurrentUser } from "@/shared/auth/session";
import Link from "next/link";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function MeetingSchedulerPage({ params }: PageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();
  const navFlags = await getProjectNavFlags(user?.id, numericProjectId);

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  if (user && !Number.isNaN(numericProjectId)) {
    try {
      team = await getTeamByUserAndProject(user.id, numericProjectId);
    } catch {
      team = null;
    }
  }

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={navFlags} />
      {team ? (
        <MeetingSchedulerContent teamId={team.id} projectId={numericProjectId} />
      ) : (
        <div style={{ padding: 24 }}>
          <p>You are not in a team for this project.</p>
          <Link href={`/projects/${projectId}`}>← Back to project</Link>
        </div>
      )}
    </div>
  );
}
