import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { StaffTrelloProjectGate } from "@/features/staff/trello/StaffTrelloProjectGate";
import { StaffTrelloSummaryView } from "@/features/staff/trello/StaffTrelloSummaryView";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffTrelloSummaryPage({ params }: PageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <StaffTrelloProjectGate projectId={projectId} needDeadline signInMessage="Please sign in to view Trello for this project.">
        {({ projectId, teamId, teamName, deadline }) => (
          <>
            <StaffProjectTrelloContent
              projectId={projectId}
              teamId={teamId}
              teamName={teamName}
              deadline={deadline ?? undefined}
              viewComponent={StaffTrelloSummaryView}
            />
          </>
        )}
      </StaffTrelloProjectGate>
    </div>
  );
}
