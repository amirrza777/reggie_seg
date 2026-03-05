"use client";

import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import { TrelloBoardView } from "@/features/trello/views/TrelloBoardView";
import { TrelloJoinBoardView } from "@/features/trello/views/TrelloJoinBoardView";
import { TrelloLinkAccountView } from "@/features/trello/views/TrelloLinkAccountView";
import { TrelloLinkBoardView } from "@/features/trello/views/TrelloLinkBoardView";
import { getMyBoards } from "@/features/trello/api/client";
import "@/features/trello/styles/loading.css";

type ProjectTrelloContentProps = {
  projectId: string;
  teamId: number;
  teamName?: string;
};

export function ProjectTrelloContent({ projectId, teamId, teamName }: ProjectTrelloContentProps) {
  const { state, setState, loadTeamBoard } = useTeamBoardState(teamId);

  if (state.status === "loading") {
    return (
      <div className="trello-loading" role="status" aria-live="polite" aria-label="Loading Trello">
        <div className="trello-loading__inner">
          <span className="trello-loading__spinner" aria-hidden="true" />
          <p className="trello-loading__label">Loading Trello…</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="trello-error" role="alert">
        <p className="trello-error__text">{state.message}</p>
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
