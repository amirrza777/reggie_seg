import { ProjectTrelloContent } from "@/features/trello/components/ProjectTrelloContent";
import { TrelloProjectGate } from "@/features/trello/components/TrelloProjectGate";
import { TrelloBoardView } from "@/features/trello/views/TrelloBoardView";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function TrelloBoardPage({ params }: PageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <TrelloProjectGate projectId={projectId} signInMessage="Please sign in to view the board.">
        {({ projectId, teamId, teamName }) => (
          <ProjectTrelloContent
            projectId={projectId}
            teamId={teamId}
            teamName={teamName}
            viewComponent={TrelloBoardView}
          />
        )}
      </TrelloProjectGate>
    </div>
  );
}
