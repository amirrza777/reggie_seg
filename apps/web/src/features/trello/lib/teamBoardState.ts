import { getMyBoards, getTeamBoard } from "@/features/trello/api/client";
import type { BoardView, OwnerBoard } from "@/features/trello/api/client";

/** single source for team board UI state, error classification, and load logic. */

export type TeamBoardViewState =
  | { status: "loading" }
  | { status: "board"; view: BoardView; sectionConfig: Record<string, string> }
  | { status: "no-team-board" }
  | { status: "link-account" }
  | { status: "link-board"; boards: OwnerBoard[] }
  | { status: "join-board"; boardUrl: string }
  | { status: "error"; message: string };

export type SetTeamBoardState = (state: TeamBoardViewState) => void;

export type LoadTeamBoardOptions = {
  /**
   * Staff read-only Trello views: no personal Trello account is required.
   */
  staffView?: boolean;
};

export function isNoBoardAssigned(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("No board assigned");
}

export function isUserNotConnected(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("User not connected") || msg.includes("not connected to Trello");
}

export function isNotMember(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Not a member");
}

export function isOwnerNotConnected(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Team owner not connected") || msg.includes("owner not connected");
}

/** Load team board and update state via setState. Used by both context and hook. */
export async function loadTeamBoardState(
  teamId: number,
  setState: SetTeamBoardState,
  options?: LoadTeamBoardOptions
): Promise<void> {
  const staffView = Boolean(options?.staffView);
  setState({ status: "loading" });
  try {
    const result = await getTeamBoard(teamId);
    if (result.ok) {
      setState({ status: "board", view: result.view, sectionConfig: result.sectionConfig });
    } else {
      setState({ status: "join-board", boardUrl: result.boardUrl });
    }
  } catch (err) {
    if (isNoBoardAssigned(err)) {
      if (staffView) {
        setState({ status: "no-team-board" });
        return;
      }
      try {
        const boards = await getMyBoards();
        setState({ status: "link-board", boards });
      } catch (myErr) {
        if (isUserNotConnected(myErr)) {
          setState({ status: "no-team-board" });
        } else {
          setState({
            status: "error",
            message: myErr instanceof Error ? myErr.message : "Failed to load your boards.",
          });
        }
      }
    } else if (isUserNotConnected(err)) {
      setState({ status: "link-account" });
    } else if (isOwnerNotConnected(err)) {
      setState({
        status: "error",
        message:
          "The team's Trello board owner has disconnected their account. Ask them to reconnect or assign a new board.",
      });
    } else {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load Trello board.",
      });
    }
  }
}
