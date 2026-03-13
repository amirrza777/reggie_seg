import { ProjectTrelloContent } from "@/features/trello/components/ProjectTrelloContent";
import { TrelloProjectGate } from "@/features/trello/components/TrelloProjectGate";
import { TrelloGraphsView } from "@/features/trello/views/TrelloGraphsView";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function TrelloGraphsPage({ params }: PageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <TrelloProjectGate projectId={projectId} needDeadline signInMessage="Please sign in to view graphs.">
        {({ projectId, teamId, teamName, deadline }) => (
          <ProjectTrelloContent
            projectId={projectId}
            teamId={teamId}
            teamName={teamName}
            deadline={deadline ?? undefined}
            viewComponent={TrelloGraphsView}
          />
        )}
      </TrelloProjectGate>
    </div>
  );
}
