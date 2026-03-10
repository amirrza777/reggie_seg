import { ProjectTrelloContent } from "@/features/trello/components/ProjectTrelloContent";
import {
  TrelloProjectGate,
  type TrelloProjectGateChildProps,
} from "@/features/trello/components/TrelloProjectGate";
import { TrelloSummaryView } from "@/features/trello/views/TrelloSummaryView";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTrelloPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <TrelloProjectGate projectId={projectId} needDeadline signInMessage="Please sign in to view Trello details for this project.">
        {({ projectId, teamId, teamName, deadline }: TrelloProjectGateChildProps) => (
          <ProjectTrelloContent
            projectId={projectId}
            teamId={teamId}
            teamName={teamName}
            deadline={deadline ?? undefined}
            viewComponent={TrelloSummaryView}
          />
        )}
      </TrelloProjectGate>
    </div>
  );
}
