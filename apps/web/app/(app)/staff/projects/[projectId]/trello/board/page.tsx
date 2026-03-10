import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { StaffTrelloProjectGate } from "@/features/staff/trello/StaffTrelloProjectGate";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import { TrelloBoardView } from "@/features/trello/views/TrelloBoardView";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffTrelloBoardPage({ params }: PageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <StaffTrelloProjectGate projectId={projectId} signInMessage="Please sign in to view the board.">
        {({ projectId, teamId, teamName }) => (
          <>
            <StaffTeamSectionNav projectId={projectId} teamId={String(teamId)} />
            <StaffProjectTrelloContent
              projectId={projectId}
              teamId={teamId}
              teamName={teamName}
              viewComponent={TrelloBoardView}
            />
          </>
        )}
      </StaffTrelloProjectGate>
    </div>
  );
}
