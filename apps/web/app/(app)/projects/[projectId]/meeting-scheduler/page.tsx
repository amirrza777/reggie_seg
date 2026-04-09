import { MeetingsPageContent } from "@/features/meetings/components/MeetingsPageContent";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function MeetingSchedulerPage({ params }: PageProps) {
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

  if (team) {
    return <MeetingsPageContent teamId={team.id} projectId={numericProjectId} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <p>You are not in a team for this project.</p>
    </div>
  );
}
