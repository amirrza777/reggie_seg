// Student shell: loads team board, handles link/configure/join flows, restricts if archived

"use client";

import { useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useEffect } from "react";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { useTrelloBoard } from "@/features/trello/context/TrelloBoardContext";
import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import { TrelloNav } from "@/features/trello/components/TrelloNav";
import { TrelloJoinBoardView } from "@/features/trello/views/TrelloJoinBoardView";
import { TrelloLinkAccountView } from "@/features/trello/views/TrelloLinkAccountView";
import { TrelloLinkBoardView } from "@/features/trello/views/TrelloLinkBoardView";
import { getMyBoards } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";
import type { BoardView } from "@/features/trello/api/client";
import type { TeamBoardViewState } from "@/features/trello/lib/teamBoardState";
import { SkeletonText } from "@/shared/ui/skeletons/Skeleton";

export type TrelloBoardContentViewProps = {
  projectId: string;
  view: BoardView;
  sectionConfig: Record<string, string>;
  onRequestChangeBoard: () => void;
  onRequestChangeAccount?: () => void;
  deadline?: ProjectDeadline | null;
  integrationsReadOnly?: boolean;
};

type ProjectTrelloContentProps = {
  projectId: string;
  teamId: number;
  teamName?: string;
  teamHasLinkedTrelloBoard: boolean;
  deadline?: ProjectDeadline | null;
  viewComponent: ComponentType<TrelloBoardContentViewProps>;
};

function archivedNoTeamBoardMessage(teamName?: string): string {
  const label = teamName?.trim() ? teamName.trim() : "Your team";
  return `${label} did not link a Trello board to this project before the project was archived.`;
}

/** Team has a board on record; viewer never linked their own Trello account. */
const ARCHIVED_COPY_PERSONAL_TRELLO_UNAVAILABLE =
  "A Trello board is linked for your team, but you did not connect your personal Trello account before this project was archived. Summary, Board, and Graphs show shared team activity. Anything that depends on your own Trello identity—for example “my tasks” or personal progress breakdowns—is not available.";

function hasBoardWithListsButNoSavedSectionConfig(state: TeamBoardViewState): boolean {
  return (
    state.status === "board" &&
    (state.view.board.lists?.length ?? 0) > 0 &&
    Object.keys(state.sectionConfig ?? {}).length === 0
  );
}

function ArchivedNotice({ children }: { children: ReactNode }) {
  return (
    <div className="ui-note ui-note--muted" role="status" style={{ marginBottom: 12 }}>
      <p className="muted" style={{ margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

export function ProjectTrelloContent({
  projectId,
  teamId,
  teamName,
  teamHasLinkedTrelloBoard,
  deadline,
  viewComponent: View,
}: ProjectTrelloContentProps) {
  const router = useRouter();
  const { canEdit: allowBoardEdits } = useProjectWorkspaceCanEdit();
  const ctx = useTrelloBoard();
  const fallback = useTeamBoardState(teamId);
  const source = ctx ?? fallback;
  const { state, setState, loadTeamBoard, mergedSectionConfig } = source;

  useEffect(() => {
    if (!allowBoardEdits) return;
    if (state.status !== "board") return;
    if (hasBoardWithListsButNoSavedSectionConfig(state)) {
      router.replace(`/projects/${projectId}/trello/configure`);
    }
  }, [allowBoardEdits, state, projectId, router]);

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
        <div className="trello-error" role="alert">
          <p className="trello-error__text">{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.status === "no-team-board") {
    if (!allowBoardEdits) {
      return (
        <div className="stack">
          <ArchivedNotice>{archivedNoTeamBoardMessage(teamName)}</ArchivedNotice>
        </div>
      );
    }
    return (
      <TrelloLinkAccountView
        projectId={projectId}
        onError={(message) => setState({ status: "error", message })}
      />
    );
  }

  if (state.status === "link-account") {
    if (!allowBoardEdits) {
      return (
        <div className="stack">
          <ArchivedNotice>
            {teamHasLinkedTrelloBoard
              ? ARCHIVED_COPY_PERSONAL_TRELLO_UNAVAILABLE
              : archivedNoTeamBoardMessage(teamName)}
          </ArchivedNotice>
        </div>
      );
    }
    return (
      <TrelloLinkAccountView
        projectId={projectId}
        onError={(message) => setState({ status: "error", message })}
      />
    );
  }

  if (state.status === "link-board") {
    if (!allowBoardEdits) {
      return (
        <div className="stack">
          <ArchivedNotice>{archivedNoTeamBoardMessage(teamName)}</ArchivedNotice>
        </div>
      );
    }
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
        boardUrl={state.boardUrl}
        onRetry={loadTeamBoard}
      />
    );
  }

  const needsDefaultListStatusFallback = hasBoardWithListsButNoSavedSectionConfig(state);

  if (needsDefaultListStatusFallback && allowBoardEdits) {
    return (
      <div className="stack">
        <p className="muted">Redirecting to configure list statuses…</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <TrelloNav
        basePath={`/projects/${projectId}/trello`}
        boardName={state.view.board.name}
        boardUrl={state.view.board.url?.trim() ? state.view.board.url : null}
      />
      <View
        projectId={projectId}
        view={state.view}
        sectionConfig={mergedSectionConfig}
        onRequestChangeBoard={onRequestChangeBoard}
        onRequestChangeAccount={onRequestChangeAccount}
        deadline={deadline}
        integrationsReadOnly={!allowBoardEdits}
      />
    </div>
  );
}
