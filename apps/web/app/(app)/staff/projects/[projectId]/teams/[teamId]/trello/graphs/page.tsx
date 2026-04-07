import { getProjectDeadline } from "@/features/projects/api/client";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { StaffTrelloGraphsView } from "@/features/staff/trello/StaffTrelloGraphsView";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTrelloGraphsPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return null;
  }

  const { user, project, team } = ctx;
  let deadline: Awaited<ReturnType<typeof getProjectDeadline>> | null = null;
  try {
    deadline = await getProjectDeadline(user.id, Number(projectId));
  } catch {
    deadline = null;
  }

  return (
    <>
      <p className="muted">
        Team: {team.teamName} · Velocity and throughput
      </p>

    <StaffProjectTrelloContent
      projectId={projectId}
      teamId={team.id}
      teamName={team.teamName}
      deadline={deadline ?? undefined}
      viewComponent={StaffTrelloGraphsView}
    />
    </>
  );
}
