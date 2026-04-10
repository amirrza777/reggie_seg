// Builds Recharts-friendly data for the cumulative progress chart

import type { ProjectDeadline } from "@/features/projects/types";
import { formatDate } from "@/shared/lib/formatDate";
import type { CumulativeByWeekPoint } from "./cumulativeByWeek";

export type SummaryChartPoint = {
  week: string;
  weekKey: string;
  time: number;
  total: number;
  completed: number;
  weekStartDateKey: string;
  weekEndDateKey: string;
};

export function normalizeProjectDeadline(deadline: ProjectDeadline | null | undefined): {
  deadlineStart: string | undefined;
  deadlineEnd: string | undefined;
  projectStartTime: number | null;
  projectEndTime: number | null;
} {
  const deadlineStart = deadline?.taskOpenDate?.trim() ? deadline.taskOpenDate.trim().slice(0, 10) : undefined;
  const deadlineEnd = deadline?.taskDueDate?.trim() ? deadline.taskDueDate.trim().slice(0, 10) : undefined;
  const projectStartTime = deadlineStart ? new Date(deadlineStart + "T12:00:00Z").getTime() : null;
  const projectEndTime = deadlineEnd ? new Date(deadlineEnd + "T12:00:00Z").getTime() : null;
  return { deadlineStart, deadlineEnd, projectStartTime, projectEndTime };
}

export function getSummaryWeekRange(
  actionsByDate: Record<string, unknown>,
  deadlineStart: string | undefined,
  deadlineEnd: string | undefined
): [string, string] {
  const todayKey = new Date().toISOString().slice(0, 10);
  const actionDateKeys = Object.keys(actionsByDate ?? {}).filter(Boolean);
  const earliestActionKey = actionDateKeys.length > 0 ? actionDateKeys.reduce((a, b) => (a <= b ? a : b)) : null;
  const latestActionKey = actionDateKeys.length > 0 ? actionDateKeys.reduce((a, b) => (a >= b ? a : b)) : null;

  const rangeMin =
    earliestActionKey != null && deadlineStart != null
      ? (earliestActionKey <= deadlineStart ? earliestActionKey : deadlineStart)
      : deadlineStart ?? earliestActionKey ?? todayKey;
  const rangeMax =
    latestActionKey != null && deadlineEnd != null
      ? (latestActionKey >= deadlineEnd ? latestActionKey : deadlineEnd)
      : deadlineEnd ?? latestActionKey ?? todayKey;
  return rangeMin <= rangeMax ? [rangeMin, rangeMax] : [rangeMax, rangeMin];
}

export function buildSummaryChartData(cumulativeByWeek: CumulativeByWeekPoint[]): {
  chartData: SummaryChartPoint[];
  dateRangeSubtitle: string | null;
  xAxisDomain: [number, number];
} {
  const chartData: SummaryChartPoint[] = cumulativeByWeek.map((p) => {
    const weekStartMs = new Date(p.weekStartDateKey + "T12:00:00Z").getTime();
    const weekEndMs = new Date(p.weekEndDateKey + "T12:00:00Z").getTime();
    return {
      week: p.weekLabel,
      weekKey: p.weekKey,
      time: (weekStartMs + weekEndMs) / 2,
      total: p.total,
      completed: p.completed,
      weekStartDateKey: p.weekStartDateKey,
      weekEndDateKey: p.weekEndDateKey,
    };
  });

  const dateRangeSubtitle =
    chartData.length > 0
      ? `${formatDate(chartData[0].weekStartDateKey)} – ${formatDate(chartData[chartData.length - 1].weekEndDateKey)}`
      : null;

  const xAxisMin = chartData.length > 0 ? new Date(chartData[0].weekStartDateKey + "T12:00:00Z").getTime() : 0;
  const xAxisMax =
    chartData.length > 0 ? new Date(chartData[chartData.length - 1].weekEndDateKey + "T12:00:00Z").getTime() : 0;
  const xAxisDomain: [number, number] = chartData.length > 0 ? [xAxisMin, xAxisMax] : [0, 0];

  return { chartData, dateRangeSubtitle, xAxisDomain };
}
