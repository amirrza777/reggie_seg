import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { TrelloBoardView } from "@/features/trello/views/TrelloBoardView";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTrelloBoardPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return (
      <div className="staff-projects stack">
        <p className="muted">{ctx.error}</p>
      </div>
    );
  }

  const { team } = ctx;

  return (
    <>
      <StaffProjectTrelloContent
        projectId={projectId}
        teamId={team.id}
        teamName={team.teamName}
        viewComponent={TrelloBoardView}
        viewExtraProps={{ filterVariant: "staff" }}
      />
    </>
  );
}
