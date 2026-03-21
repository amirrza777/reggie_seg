"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useTrelloBoard } from "@/features/trello/context/TrelloBoardContext";
import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import { StaffTrelloNav } from "./StaffTrelloNav";
import { getMyBoards } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";
import type { BoardView } from "@/features/trello/api/client";

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
  teamName?: string;
  deadline?: ProjectDeadline | null;
  viewComponent: ComponentType<StaffTrelloContentViewProps>;
};

const STAFF_BACK_HREF = (projectId: string) => `/staff/projects/${projectId}`;

export function StaffProjectTrelloContent({
  projectId,
  teamId,
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
      <div className="stack">
        <p>Loading Trello…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="stack">
        <Link href={STAFF_BACK_HREF(projectId)}>← Back to project</Link>
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
        <Link href={STAFF_BACK_HREF(projectId)}>← Back to project</Link>
        <p className="muted">The team has not connected Trello yet.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <StaffTrelloNav
        projectId={projectId}
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
