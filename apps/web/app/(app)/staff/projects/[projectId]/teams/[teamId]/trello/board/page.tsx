import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { StaffTrelloProjectGate } from "@/features/staff/trello/StaffTrelloProjectGate";
import { StaffTrelloBoardView } from "@/features/staff/trello/StaffTrelloBoardView";

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
            <StaffProjectTrelloContent
              projectId={projectId}
              teamId={teamId}
              teamName={teamName}
              viewComponent={StaffTrelloBoardView}
            />
          </>
        )}
      </StaffTrelloProjectGate>
    </div>
  );
}
