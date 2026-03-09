import { ConfigureTrelloContent } from "@/features/trello/components/ConfigureTrelloContent";
import { TrelloProjectGate } from "@/features/trello/components/TrelloProjectGate";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ConfigureTrelloPage({ params }: PageProps) {
  const { projectId } = await params;

  return (
    <div className="stack">
      <TrelloProjectGate
        projectId={projectId}
        signInMessage="Please sign in to configure Trello."
        redirectToLoginIfUnauthenticated
      >
        {({ projectId, teamId, teamName }) => (
          <ConfigureTrelloContent
            projectId={projectId}
            teamId={teamId}
            teamName={teamName}
          />
        )}
      </TrelloProjectGate>
    </div>
  );
}
