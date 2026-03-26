"use client";

import type { ComponentType } from "react";
import { useTrelloBoard } from "@/features/trello/context/TrelloBoardContext";
import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import { StaffTrelloNav } from "./StaffTrelloNav";
import { getMyBoards } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";
import type { BoardView } from "@/features/trello/api/client";
import { SkeletonText } from "@/shared/ui/Skeleton";

export type StaffTrelloContentViewProps = {
  projectId: string;
  view: BoardView;
  sectionConfig: Record<string, string>;
  onRequestChangeBoard: () => void;
  onRequestChangeAccount?: () => void;
  deadline?: ProjectDeadline | null;
};

type StaffProjectTrelloContentProps = {
  projectId: string;
  teamId: number;
  moduleId?: string | number | null;
  teamName?: string;
  deadline?: ProjectDeadline | null;
  viewComponent: ComponentType<StaffTrelloContentViewProps>;
};

export function StaffProjectTrelloContent({
  projectId,
  teamId,
  moduleId,
  deadline,
  viewComponent: View,
}: StaffProjectTrelloContentProps) {
  const ctx = useTrelloBoard();
  const fallback = useTeamBoardState(teamId);
  const source = ctx ?? fallback;
  const { state, setState, mergedSectionConfig } = source;

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
      <div className="stack" role="status" aria-live="polite">
        <SkeletonText lines={2} widths={["28%", "64%"]} />
        <span className="ui-visually-hidden">Loading Trello…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="stack">
        <p>{state.message}</p>
      </div>
    );
  }

  if (
    state.status === "link-account" ||
    state.status === "link-board" ||
    state.status === "join-board"
  ) {
    return (
      <div className="stack">
        <p className="muted">The team has not connected Trello yet.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <StaffTrelloNav
        projectId={projectId}
        teamId={teamId}
        moduleId={moduleId}
        boardName={state.view.board.name}
        boardUrl={state.view.board.url}
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
