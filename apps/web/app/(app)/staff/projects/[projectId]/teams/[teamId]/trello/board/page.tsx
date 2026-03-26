import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { StaffTrelloBoardView } from "@/features/staff/trello/StaffTrelloBoardView";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTrelloBoardPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return null;
  }

  const { team } = ctx;

  return (
    <StaffProjectTrelloContent
      projectId={projectId}
      teamId={team.id}
      teamName={team.teamName}
      viewComponent={StaffTrelloBoardView}
    />
  );
}
