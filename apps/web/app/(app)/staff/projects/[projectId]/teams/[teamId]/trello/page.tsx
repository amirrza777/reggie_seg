import { getProjectDeadline } from "@/features/projects/api/client";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { StaffTrelloSummaryView } from "@/features/staff/trello/StaffTrelloSummaryView";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTrelloSummaryPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return null;
  }

  const { user, team } = ctx;
  let deadline: Awaited<ReturnType<typeof getProjectDeadline>> | null = null;
  try {
    deadline = await getProjectDeadline(user.id, Number(projectId));
  } catch {
    deadline = null;
  }

  return (
    <StaffProjectTrelloContent
      projectId={projectId}
      teamId={team.id}
      teamName={team.teamName}
      deadline={deadline ?? undefined}
      viewComponent={StaffTrelloSummaryView}
    />
  );
}
