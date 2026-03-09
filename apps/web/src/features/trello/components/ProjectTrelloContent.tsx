"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect } from "react";
import { useTrelloBoard } from "@/features/trello/context/TrelloBoardContext";
import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import { TrelloNav } from "@/features/trello/components/TrelloNav";
import { TrelloJoinBoardView } from "@/features/trello/views/TrelloJoinBoardView";
import { TrelloLinkAccountView } from "@/features/trello/views/TrelloLinkAccountView";
import { TrelloLinkBoardView } from "@/features/trello/views/TrelloLinkBoardView";
import { getMyBoards } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";
import type { BoardView } from "@/features/trello/api/client";

export type TrelloBoardContentViewProps = {
  projectId: string;
  view: BoardView;
  sectionConfig: Record<string, string>;
  onRequestChangeBoard: () => void;
  onRequestChangeAccount?: () => void;
  deadline?: ProjectDeadline | null;
};

type ProjectTrelloContentProps = {
  projectId: string;
  teamId: number;
  teamName?: string;
  deadline?: ProjectDeadline | null;
  viewComponent: ComponentType<TrelloBoardContentViewProps>;
};

const hasListsButNoSavedConfig = (state: { status: string; view?: { board?: { lists?: unknown[] } }; sectionConfig?: Record<string, string> }) =>
  state.status === "board" &&
  (state.view?.board?.lists?.length ?? 0) > 0 &&
  Object.keys(state.sectionConfig ?? {}).length === 0;

export function ProjectTrelloContent({ projectId, teamId, teamName, deadline, viewComponent: View }: ProjectTrelloContentProps) {
  const router = useRouter();
  const ctx = useTrelloBoard();
  const fallback = useTeamBoardState(teamId);
  const source = ctx ?? fallback;
  const { state, setState, loadTeamBoard, mergedSectionConfig } = source;

  useEffect(() => {
    if (state.status !== "board") return;
    if (hasListsButNoSavedConfig(state)) {
      router.replace(`/projects/${projectId}/trello/configure`);
    }
  }, [state, projectId, router]);

  const onRequestChangeBoard = async () => {
    try {
      const boards = await getMyBoards();
      setState({ status: "link-board", boards });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load your boards.",
      });
    }
  };

  const onRequestChangeAccount = () => {
    setState({ status: "link-account" });
  };

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

  // Don't render velocity/summary/graphs until section config is saved (avoid calculating with defaults)
  if (hasListsButNoSavedConfig(state)) {
    return (
      <div className="stack">
        <p className="muted">Redirecting to configure list statuses…</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <TrelloNav
        projectId={projectId}
        boardName={state.view.board.name}
        boardUrl={state.view.board.url ?? ""}
      />
      <View
        projectId={projectId}
        view={state.view}
        sectionConfig={mergedSectionConfig}
        onRequestChangeBoard={onRequestChangeBoard}
        onRequestChangeAccount={onRequestChangeAccount}
        deadline={deadline}
      />
    </div>
  );
}
