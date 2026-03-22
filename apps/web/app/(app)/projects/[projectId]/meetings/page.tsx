import { MeetingsPageContent } from "@/features/meetings/components/MeetingsPageContent";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import Link from "next/link";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProjectMeetingsPage({ params, searchParams }: ProjectPageProps) {
  const { projectId } = await params;
  const { tab } = await searchParams;
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
    return <MeetingsPageContent teamId={team.id} projectId={numericProjectId} initialTab={tab === "previous" ? "previous" : "upcoming"} />;
  }

  return (
    <div className="stack">
      <p>You are not in a team for this project.</p>
      <Link href={`/projects/${projectId}`}>← Back to project</Link>
    </div>
  );
}
