// Returns the board state for a given day.

import type { TrelloBoardAction, TrelloCard } from "../types";

export function getBoardStateAtDate(
  cardsByList: Record<string, TrelloCard[]>,
  actionsByDate: Record<string, TrelloBoardAction[]>,
  dateKey: string
): Record<string, TrelloCard[]> {
  const cutoffEnd = new Date(dateKey + "T23:59:59.999Z").getTime();
  const state: Record<string, string> = {};
  for (const cards of Object.values(cardsByList)) {
    for (const card of cards) {
      state[card.id] = card.idList;
    }
  }

  const allActions = Object.values(actionsByDate).flat();
  const allActionsDesc = [...allActions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const action of allActionsDesc) {
    if (new Date(action.date).getTime() <= cutoffEnd) break;
    const cardId = action.data?.card?.id;
    if (!cardId) continue;
    if (action.type === "createCard") {
      delete state[cardId];
    } else if (
      action.type === "updateCard" &&
      action.data?.listBefore?.id
    ) {
      state[cardId] = action.data.listBefore.id;
    }
  }

  const cardsById = new Map<string, TrelloCard>();
  for (const cards of Object.values(cardsByList)) {
    for (const card of cards) {
      cardsById.set(card.id, card);
    }
  }

  const result: Record<string, TrelloCard[]> = {};
  for (const [cardId, listId] of Object.entries(state)) {
    const card = cardsById.get(cardId);
    if (!card) continue;
    if (!result[listId]) result[listId] = [];
    result[listId].push(card);
  }
  return result;
}

export function getDateKeysWithActions(
  actionsByDate: Record<string, TrelloBoardAction[]>
): string[] {
  return Object.keys(actionsByDate).sort((a, b) => a.localeCompare(b));
}

function addDays(dateKey: string, delta: number): string {
  const d = new Date(dateKey + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function getCalendarDaysInRange(firstChangeDate: string): string[] {
  const today = new Date().toISOString().slice(0, 10);
  if (firstChangeDate > today) return [];
  const out: string[] = [];
  let d = firstChangeDate;
  while (d <= today) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

/** Previous calendar day, or null if none. */
export function prevCalendarDay(dateKey: string, minDate: string): string | null {
  const prev = addDays(dateKey, -1);
  return prev < minDate ? null : prev;
}

/** Next calendar day, or null if past today. */
export function nextCalendarDay(dateKey: string): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const next = addDays(dateKey, 1);
  return next > today ? null : next;
}

/** Previous date in changeDays that is strictly before dateKey; or null. */
export function prevChangeDay(
  dateKey: string,
  changeDays: string[]
): string | null {
  const idx = changeDays.findIndex((d) => d >= dateKey);
  if (idx <= 0) return null;
  return changeDays[idx - 1];
}

/** Next date in changeDays that is strictly after dateKey; or "current" if dateKey is last or later. */
export function nextChangeDay(
  dateKey: string,
  changeDays: string[]
): string | "current" {
  for (let i = 0; i < changeDays.length; i++) {
    if (changeDays[i] > dateKey) return changeDays[i];
  }
  return "current";
}
