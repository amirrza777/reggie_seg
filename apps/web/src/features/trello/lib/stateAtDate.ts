// Helpers for card positions and per-status counts at a point in time

import type { TrelloBoardAction, TrelloCard } from "../types";
import { getListStatus } from "./listStatus";

/** Build map of card id -> list id from current board state. */
export function buildCurrentState(cardsByList: Record<string, TrelloCard[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(cardsByList).flatMap(([listId, cards]) => cards.map((c) => [c.id, listId] as const))
  );
}

/** Count backlog / in progress / completed at end of dateKey by replaying actions backward from current state. */
export function computeCountsAtDate(
  dateKey: string,
  allActionsDesc: TrelloBoardAction[],
  currentState: Record<string, string>,
  listNamesById: Record<string, string>,
  sectionConfig: Record<string, string>
): { backlog: number; inProgress: number; completed: number } {
  const cutoffEnd = new Date(dateKey + "T23:59:59.999Z").getTime();
  const state = { ...currentState };
  for (const action of allActionsDesc) {
    if (new Date(action.date).getTime() <= cutoffEnd) break;
    const cardId = action.data?.card?.id;
    if (!cardId) continue;
    if (action.type === "createCard") delete state[cardId];
    else if (action.type === "updateCard" && action.data?.listBefore?.id) state[cardId] = action.data.listBefore.id;
  }
  let backlog = 0, inProgress = 0, completed = 0;
  for (const listId of Object.values(state)) {
    const status = getListStatus(listNamesById[listId] ?? "", sectionConfig);
    if (status === null) continue;
    if (status === "backlog") backlog++;
    else if (status === "completed") completed++;
    else inProgress++;
  }
  return { backlog, inProgress, completed };
}
