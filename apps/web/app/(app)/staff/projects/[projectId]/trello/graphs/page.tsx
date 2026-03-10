import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { StaffTrelloProjectGate } from "@/features/staff/trello/StaffTrelloProjectGate";
import { StaffTrelloGraphsView } from "@/features/staff/trello/StaffTrelloGraphsView";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffTrelloGraphsPage({ params }: PageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <StaffTrelloProjectGate projectId={projectId} needDeadline signInMessage="Please sign in to view graphs.">
        {({ projectId, teamId, teamName, deadline }) => (
          <StaffProjectTrelloContent
            projectId={projectId}
            teamId={teamId}
            teamName={teamName}
            deadline={deadline ?? undefined}
            viewComponent={StaffTrelloGraphsView}
          />
        )}
      </StaffTrelloProjectGate>
    </div>
  );
}
