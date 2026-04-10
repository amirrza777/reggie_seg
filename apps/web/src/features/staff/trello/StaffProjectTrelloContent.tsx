// Staff Trello shell: read-only board data load + nav

"use client";

import type { ComponentType } from "react";
import { usePathname } from "next/navigation";
import { useTrelloBoard } from "@/features/trello/context/TrelloBoardContext";
import { useTeamBoardState } from "@/features/trello/hooks/useTeamBoardState";
import { TrelloNav } from "@/features/trello/components/TrelloNav";
import { resolveStaffTeamBasePath } from "@/features/staff/projects/components/navBasePath";
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

export type StaffTrelloViewExtraProps = {
  integrationsReadOnly?: boolean;
  showIntegrationSettings?: boolean;
  filterVariant?: "project" | "staff";
};

type StaffProjectTrelloContentProps = {
  projectId: string;
  teamId: number;
  moduleId?: string | number | null;
  teamName?: string;
  deadline?: ProjectDeadline | null;
  viewComponent: ComponentType<StaffTrelloContentViewProps>;
  viewExtraProps?: StaffTrelloViewExtraProps;
};

export function StaffProjectTrelloContent({
  projectId,
  teamId,
  moduleId,
  deadline,
  viewComponent: View,
  viewExtraProps,
}: StaffProjectTrelloContentProps) {
  const pathname = usePathname();
  const ctx = useTrelloBoard();
  const fallback = useTeamBoardState(teamId, { staffView: true });
  const source = ctx ?? fallback;
  const { state, setState, mergedSectionConfig } = source;

  const trelloBasePath = `${resolveStaffTeamBasePath({
    projectId,
    teamId: String(teamId),
    moduleId,
    pathname,
  })}/trello`;

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

  if (state.status === "no-team-board" || state.status === "link-board") {
    return (
      <div className="stack">
        <p className="muted">This team does not have a Trello board linked yet.</p>
      </div>
    );
  }

  if (state.status === "link-account") {
    return (
      <div className="stack">
        <p className="muted">
          Trello data could not be loaded for this team (connection or authorisation issue on the server).
        </p>
      </div>
    );
  }

  if (state.status === "join-board") {
    return (
      <div className="stack">
        <p className="muted">
          The board could not be loaded in full.{" "}
          {state.boardUrl ? (
            <a href={state.boardUrl} target="_blank" rel="noreferrer">
              Open the board in Trello
            </a>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <TrelloNav
        basePath={trelloBasePath}
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
        {...viewExtraProps}
      />
    </div>
  );
}
