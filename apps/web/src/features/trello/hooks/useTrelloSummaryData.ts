// Summary metrics (counts, velocity, cumulative chart series) from a `BoardView` + section config + deadline.
// Used by: `TrelloSummaryView` (student and staff).

import type { BoardView } from "@/features/trello/api/client";
import {
  computeCumulativeByWeek,
  computeVelocity,
  countCardsByStatus,
} from "@/features/trello/lib/velocity";
import {
  buildSummaryChartData,
  getSummaryWeekRange,
  normalizeProjectDeadline,
} from "@/features/trello/lib/summaryChartData";
import type { ProjectDeadline } from "@/features/projects/types";
import type { SummaryChartPoint } from "@/features/trello/lib/summaryChartData";

const CUMULATIVE_WEEKS = 12;

export function useTrelloSummaryData(
  view: BoardView,
  sectionConfig: Record<string, string>,
  deadline?: ProjectDeadline | null
): {
  counts: ReturnType<typeof countCardsByStatus>;
  velocity: ReturnType<typeof computeVelocity>;
  chartData: SummaryChartPoint[];
  dateRangeSubtitle: string | null;
  xAxisDomain: [number, number];
  deadlineStart: string | undefined;
  deadlineEnd: string | undefined;
  projectStartTime: number | null;
  projectEndTime: number | null;
  boardUrl: string | undefined;
} {
  const cardsByList = view.cardsByList ?? {};
  const listNamesById = view.listNamesById ?? {};
  const actionsByDate = view.actionsByDate ?? {};
  const counts = countCardsByStatus(cardsByList, listNamesById, sectionConfig);
  const velocity = computeVelocity(actionsByDate, listNamesById, sectionConfig);

  const {
    deadlineStart,
    deadlineEnd,
    projectStartTime,
    projectEndTime,
  } = normalizeProjectDeadline(deadline);

  const [weekRangeStart, weekRangeEnd] = getSummaryWeekRange(
    actionsByDate as Record<string, unknown>,
    deadlineStart,
    deadlineEnd
  );

  const cumulativeByWeek = computeCumulativeByWeek(
    actionsByDate,
    listNamesById,
    sectionConfig ?? {},
    cardsByList,
    CUMULATIVE_WEEKS,
    weekRangeStart,
    weekRangeEnd
  );

  const { chartData, dateRangeSubtitle, xAxisDomain } = buildSummaryChartData(cumulativeByWeek);

  return {
    counts,
    velocity,
    chartData,
    dateRangeSubtitle,
    xAxisDomain,
    deadlineStart,
    deadlineEnd,
    projectStartTime,
    projectEndTime,
    boardUrl: view.board?.url,
  };
}
