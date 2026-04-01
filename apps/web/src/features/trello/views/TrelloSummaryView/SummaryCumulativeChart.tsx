"use client";

import {
  BarChart,
  Bar,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/shared/lib/formatDate";
import type { SummaryChartPoint } from "@/features/trello/lib/summaryChartData";
import { getWeekStartKeyUTC } from "@/features/trello/lib/weekUtils";
import { useChartCursorTooltip } from "@/shared/ui/usePieCursorTooltip";
import { ProjectBoundaryReferenceLine } from "../../components/ProjectBoundaryReferenceLine";
import { TrelloTimeXAxis } from "../../components/TrelloTimeXAxis";

type Props = {
  chartData: SummaryChartPoint[];
  dateRangeSubtitle: string | null;
  xAxisDomain: [number, number];
  deadlineStart?: string;
  deadlineEnd?: string;
  projectStartTime: number | null;
  projectEndTime: number | null;
};

export function SummaryCumulativeChart({
  chartData,
  dateRangeSubtitle,
  xAxisDomain,
  deadlineStart,
  deadlineEnd,
  projectStartTime,
  projectEndTime,
}: Props) {
  const { containerHandlers, chartHandlers, tooltipProps } = useChartCursorTooltip();
  const [xAxisMin, xAxisMax] = xAxisDomain;
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const startWeekMs =
    deadlineStart && projectStartTime != null
      ? new Date(getWeekStartKeyUTC(new Date(projectStartTime)) + "T12:00:00Z").getTime()
      : null;
  const showStartLine =
    deadlineStart && projectStartTime != null && xAxisMin <= projectStartTime && projectStartTime <= xAxisMax;
  const showEndLine =
    deadlineEnd &&
    projectEndTime != null &&
    projectEndTime !== projectStartTime &&
    xAxisMin <= projectEndTime &&
    projectEndTime <= xAxisMax;

  return (
    <section className="placeholder stack">
      <h2 className="eyebrow">Project progress</h2>
      <p className="muted">Cumulative tracking of cards completed per week, out of all cards.</p>
      {dateRangeSubtitle ? (
        <p className="muted">
          {dateRangeSubtitle}
        </p>
      ) : null}

      {chartData.length > 0 ? (
        <div
          className="ui-no-select"
          style={{ width: "100%", height: 320 }}
          {...containerHandlers}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 40, right: 24, left: 8, bottom: 24 }}
              barCategoryGap="20%"
              accessibilityLayer={false}
              {...chartHandlers}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <TrelloTimeXAxis domain={xAxisDomain} scale="linear" />
              <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(max ?? 0, 1)]} />
              <Tooltip
                {...tooltipProps}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as SummaryChartPoint;
                  /* label tooltip with week label (start week = 1, any weeks before are negative) */
                  const weekLabel =
                    startWeekMs != null
                      ? (() => {
                          const weekStartMs = new Date(p.weekStartDateKey + "T12:00:00Z").getTime();
                          const diffWeeks = (weekStartMs - startWeekMs) / weekMs;
                          const relativeWeek =
                            weekStartMs >= startWeekMs
                              ? 1 + Math.floor(diffWeeks)
                              : Math.ceil(diffWeeks);
                          return `Week ${relativeWeek}`;
                        })()
                      : p.week;
                  return (
                    <div className="ui-chart-tooltip ui-chart-tooltip--compact">
                      <p className="ui-chart-tooltip__label">{weekLabel}</p>
                      <p className="ui-chart-tooltip__meta">
                        {formatDate(p.weekStartDateKey)} – {formatDate(p.weekEndDateKey)}
                      </p>
                      <p className="ui-chart-tooltip__summary">
                        Total: {payload.find((e) => e.dataKey === "total")?.value ?? 0} · Completed:{" "}
                        {payload.find((e) => e.dataKey === "completed")?.value ?? 0}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              {showStartLine && (
                <ProjectBoundaryReferenceLine
                  x={projectStartTime!}
                  color="#0079bf"
                  title="Project starts"
                  dateLabel={formatDate(deadlineStart!)}
                />
              )}
              {showEndLine && (
                <ProjectBoundaryReferenceLine
                  x={projectEndTime!}
                  color="#61bd4f"
                  title="Project ends"
                  dateLabel={formatDate(deadlineEnd!)}
                />
              )}
              <Bar
                dataKey="total"
                name="Total cards"
                fill="var(--muted-subtle, #97a0af)"
                radius={[4, 4, 0, 0]}
                barSize={28}
                isAnimationActive
              />
              <Bar
                dataKey="completed"
                name="Completed"
                fill="var(--accent-strong, #61bd4f)"
                radius={[4, 4, 0, 0]}
                barSize={28}
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="muted">No data yet.</p>
      )}
    </section>
  );
}
