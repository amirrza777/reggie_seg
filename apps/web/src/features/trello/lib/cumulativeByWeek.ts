// Aggregates card flow into weekly cumulative totals (for summary chart)

import type { TrelloBoardAction, TrelloCard } from "../types";
import { getWeekStartKeyUTC, addDaysUTC, getWeekKeysBetweenDateKeys } from "./weekUtils";
import { buildCurrentState, computeCountsAtDate } from "./stateAtDate";

export type CumulativeByWeekPoint = {
  weekKey: string;
  weekLabel: string;
  weekNumber: number;
  weekStartDateKey: string;
  weekEndDateKey: string;
  total: number;
  completed: number;
};

function getWeekRangeKeys(
  allActions: TrelloBoardAction[],
  startKey: string | undefined,
  endKey: string | undefined
): string[] {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (startKey && endKey) {
    const [rangeStart, rangeEnd] = startKey <= endKey ? [startKey, endKey] : [endKey, startKey];
    return getWeekKeysBetweenDateKeys(rangeStart, rangeEnd);
  }
  if (startKey) {return getWeekKeysBetweenDateKeys(startKey, todayKey);}
  if (endKey) {
    const endDate = new Date(endKey + "T12:00:00Z");
    endDate.setUTCDate(endDate.getUTCDate() - 52 * 7);
    return getWeekKeysBetweenDateKeys(endDate.toISOString().slice(0, 10), endKey);
  }
  const dateKeys = allActions.map((a) => a.date.slice(0, 10));
  const earliest = dateKeys.length ? dateKeys.reduce((a, b) => (a <= b ? a : b)) : todayKey;
  const latest = dateKeys.length ? dateKeys.reduce((a, b) => (a >= b ? a : b)) : todayKey;
  return getWeekKeysBetweenDateKeys(earliest, latest > todayKey ? todayKey : latest);
}

export function computeCumulativeByWeek(
  actionsByDate: Record<string, TrelloBoardAction[]>,
  listNamesById: Record<string, string>,
  sectionConfig: Record<string, string>,
  cardsByList: Record<string, TrelloCard[]>,
  _lastNWeeks: number = 12,
  projectStartDateKey?: string | null,
  projectEndDateKey?: string | null
): CumulativeByWeekPoint[] {
  void _lastNWeeks;
  const currentState = buildCurrentState(cardsByList);
  const allActions = Object.values(actionsByDate).flat();
  const allActionsDesc = [...allActions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const todayKey = new Date().toISOString().slice(0, 10);
  const startKey = projectStartDateKey?.trim() || undefined;
  const endKey = projectEndDateKey?.trim() || undefined;

  let weekKeysToUse = getWeekRangeKeys(allActions, startKey, endKey);
  if (weekKeysToUse.length === 0) {weekKeysToUse = [getWeekStartKeyUTC(new Date())];}

  const projectStartWeekStart = startKey ? getWeekStartKeyUTC(new Date(startKey + "T12:00:00Z")) : null;

  const result: CumulativeByWeekPoint[] = [];
  for (const weekKey of weekKeysToUse) {
    const weekEndDateKey = addDaysUTC(weekKey, 6);
    const isFuture = weekEndDateKey > todayKey;
    const { backlog, inProgress, completed } = isFuture
      ? { backlog: 0, inProgress: 0, completed: 0 }
      : computeCountsAtDate(weekEndDateKey, allActionsDesc, currentState, listNamesById, sectionConfig);
    result.push({
      weekKey,
      weekLabel: "",
      weekNumber: 0,
      weekStartDateKey: weekKey,
      weekEndDateKey,
      total: backlog + inProgress + completed,
      completed,
    });
  }

  const projectStartMs = projectStartWeekStart ? new Date(projectStartWeekStart + "T12:00:00Z").getTime() : null;
  return result.map((p, i) => {
    const weekNumber = projectStartMs != null
      ? (() => {
          const offsetWeeks = Math.round((new Date(p.weekStartDateKey + "T12:00:00Z").getTime() - projectStartMs) / (7 * 86400000));
          return offsetWeeks >= 0 ? offsetWeeks + 1 : offsetWeeks;
        })()
      : i + 1;
    return { ...p, weekLabel: `Week ${weekNumber}`, weekNumber };
  });
}
