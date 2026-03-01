"use client";

import Link from "next/link";
import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import { TrelloBoardView } from "@/features/trello/views/TrelloBoardView";
import { TrelloJoinBoardView } from "@/features/trello/views/TrelloJoinBoardView";
import { TrelloLinkAccountView } from "@/features/trello/views/TrelloLinkAccountView";
import { TrelloLinkBoardView } from "@/features/trello/views/TrelloLinkBoardView";
import { getMyBoards } from "@/features/trello/api/client";

type ProjectTrelloContentProps = {
  projectId: string;
  teamId: number;
  teamName?: string;
};

export function ProjectTrelloContent({ projectId, teamId, teamName }: ProjectTrelloContentProps) {
  const { state, setState, loadTeamBoard } = useTeamBoardState(teamId);

  if (state.status === "loading") {
    return (
      <div className="stack">
        <p>Loading Trello…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="stack">
        <p>{state.message}</p>
        <Link href={`/projects/${projectId}`}>← Back to project</Link>
      </div>
    );
  }

  if (state.status === "link-account") {
    return (
      <TrelloLinkAccountView
        projectId={projectId}
        onError={(message) => setState({ status: "error", message })}
      />
    );
  }

  if (state.status === "link-board") {
    return (
      <TrelloLinkBoardView
        projectId={projectId}
        teamId={teamId}
        teamName={teamName}
        boards={state.boards}
        onAssigned={loadTeamBoard}
      />
    );
  }

  if (state.status === "join-board") {
    return (
      <TrelloJoinBoardView
        projectId={projectId}
        boardUrl={state.boardUrl}
        onRetry={loadTeamBoard}
      />
    );
  }

  return (
    <TrelloBoardView
      projectId={projectId}
      view={state.view}
      onRequestChangeBoard={async () => {
        try {
          const boards = await getMyBoards();
          setState({ status: "link-board", boards });
        } catch (err) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load your boards.",
          });
        }
      }}
    />
  );
}
