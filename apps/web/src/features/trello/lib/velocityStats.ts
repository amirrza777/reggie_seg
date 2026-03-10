import type { TrelloBoardAction, TrelloCard } from "../types";
import { getListStatus } from "./listStatus";
import { getWeekStartKeyLocal, getEndOfWeekDateKey } from "./weekUtils";
import { buildCurrentState, computeCountsAtDate } from "./stateAtDate";

export type VelocityStats = {
  thisWeek: number;
  lastWeek: number;
  percentChange: number | null;
  byWeek: { weekKey: string; count: number }[];
};

export function computeVelocity(
  actionsByDate: Record<string, TrelloBoardAction[]>,
  listNamesById: Record<string, string>,
  sectionConfig: Record<string, string>
): VelocityStats {
  const completedListIds = new Set(
    Object.entries(listNamesById)
      .filter(([, name]) => getListStatus(name, sectionConfig) === "completed")
      .map(([id]) => id)
  );
  const byWeekMap = new Map<string, number>();
  const now = new Date();
  const thisWeekKey = getWeekStartKeyLocal(now);
  const lastWeekKey = getWeekStartKeyLocal(new Date(now.getTime() - 7 * 86400000));

  for (const action of Object.values(actionsByDate).flat()) {
    if (action.type !== "updateCard" || !action.data?.listAfter?.id || !completedListIds.has(action.data.listAfter.id)) continue;
    const weekKey = getWeekStartKeyLocal(new Date(action.date));
    byWeekMap.set(weekKey, (byWeekMap.get(weekKey) ?? 0) + 1);
  }

  const thisWeek = byWeekMap.get(thisWeekKey) ?? 0;
  const lastWeek = byWeekMap.get(lastWeekKey) ?? 0;
  const byWeek = [...byWeekMap.entries()].map(([weekKey, count]) => ({ weekKey, count })).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  const percentChange = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  return { thisWeek, lastWeek, percentChange, byWeek };
}

export type VelocityByWeekPoint = { weekKey: string; weekLabel: string; completed: number; nonCompleted: number };

export function computeVelocityWithNonCompleted(
  actionsByDate: Record<string, TrelloBoardAction[]>,
  listNamesById: Record<string, string>,
  sectionConfig: Record<string, string>,
  cardsByList: Record<string, TrelloCard[]>
): VelocityStats & { byWeekWithNonCompleted: VelocityByWeekPoint[] } {
  const base = computeVelocity(actionsByDate, listNamesById, sectionConfig);
  const currentState = buildCurrentState(cardsByList);
  const allActionsDesc = [...Object.values(actionsByDate).flat()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const byWeekWithNonCompleted: VelocityByWeekPoint[] = base.byWeek.map(({ weekKey, count }) => {
    const endDateKey = getEndOfWeekDateKey(weekKey);
    const { backlog, inProgress } = endDateKey
      ? computeCountsAtDate(endDateKey, allActionsDesc, currentState, listNamesById, sectionConfig)
      : { backlog: 0, inProgress: 0 };
    return { weekKey, weekLabel: weekKey, completed: count, nonCompleted: backlog + inProgress };
  });
  return { ...base, byWeekWithNonCompleted };
}
