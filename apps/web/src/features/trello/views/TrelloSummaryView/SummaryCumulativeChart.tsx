"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatDate } from "@/shared/lib/formatDate";
import type { SummaryChartPoint } from "@/features/trello/lib/summaryChartData";
import { getWeekStartKeyUTC } from "@/features/trello/lib/weekUtils";

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
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 40, right: 24, left: 8, bottom: 24 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="time"
                domain={xAxisDomain}
                scale="linear"
                tickFormatter={(t: number) => formatDate(new Date(t).toISOString().slice(0, 10))}
                padding={{ left: 24, right: 24 }}
              />
              <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(max ?? 0, 1)]} />
              <Tooltip
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
                    <div className="placeholder stack" style={{ padding: "8px 12px", gap: 4 }}>
                      <div>{weekLabel}</div>
                      <div className="muted" style={{ fontSize: "0.85em" }}>
                        {formatDate(p.weekStartDateKey)} – {formatDate(p.weekEndDateKey)}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        Total: {payload.find((e) => e.dataKey === "total")?.value ?? 0} · Completed:{" "}
                        {payload.find((e) => e.dataKey === "completed")?.value ?? 0}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend />
              {showStartLine && (
                <ReferenceLine
                  x={projectStartTime!}
                  stroke="#0079bf"
                  strokeDasharray="4 4"
                  label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                    const x = viewBox?.x ?? 0;
                    const y = (viewBox?.y ?? 0) - 8;
                    return (
                      <text x={x} y={y} textAnchor="middle" fill="#0079bf" fontSize={11}>
                        <tspan x={x} dy="0">
                          Project starts
                        </tspan>
                        <tspan x={x} dy="14" fontSize={10} opacity={0.9}>
                          {formatDate(deadlineStart!)}
                        </tspan>
                      </text>
                    );
                  }}
                />
              )}
              {showEndLine && (
                <ReferenceLine
                  x={projectEndTime!}
                  stroke="#61bd4f"
                  strokeDasharray="4 4"
                  label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                    const x = viewBox?.x ?? 0;
                    const y = (viewBox?.y ?? 0) - 8;
                    return (
                      <text x={x} y={y} textAnchor="middle" fill="#61bd4f" fontSize={11}>
                        <tspan x={x} dy="0">
                          Project ends
                        </tspan>
                        <tspan x={x} dy="14" fontSize={10} opacity={0.9}>
                          {formatDate(deadlineEnd!)}
                        </tspan>
                      </text>
                    );
                  }}
                />
              )}
              <Bar
                dataKey="total"
                name="Total cards"
                fill="var(--muted-subtle, #97a0af)"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                fill="var(--accent-strong, #61bd4f)"
                radius={[4, 4, 0, 0]}
                barSize={28}
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
