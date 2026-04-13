// Bar chart of cumulative total cards vs completed
// optional deadline reference lines

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
import { useChartCursorTooltip } from "@/shared/ui/progress/usePieCursorTooltip";
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

type SummaryBoundaryState = {
  startWeekMs: number | null;
  showStartLine: boolean;
  showEndLine: boolean;
};

function getSummaryBoundaryState(props: Props): SummaryBoundaryState {
  const [xAxisMin, xAxisMax] = props.xAxisDomain;
  const startWeekMs =
    props.deadlineStart && props.projectStartTime != null
      ? new Date(getWeekStartKeyUTC(new Date(props.projectStartTime)) + "T12:00:00Z").getTime()
      : null;
  const showStartLine =
    props.deadlineStart &&
    props.projectStartTime != null &&
    xAxisMin <= props.projectStartTime &&
    props.projectStartTime <= xAxisMax;
  const showEndLine =
    props.deadlineEnd &&
    props.projectEndTime != null &&
    props.projectEndTime !== props.projectStartTime &&
    xAxisMin <= props.projectEndTime &&
    props.projectEndTime <= xAxisMax;
  return { startWeekMs, showStartLine: Boolean(showStartLine), showEndLine: Boolean(showEndLine) };
}

function getRelativeWeekLabel(point: SummaryChartPoint, startWeekMs: number | null, weekMs: number) {
  if (startWeekMs == null) {
    return point.week;
  }

  const weekStartMs = new Date(point.weekStartDateKey + "T12:00:00Z").getTime();
  const diffWeeks = (weekStartMs - startWeekMs) / weekMs;
  const relativeWeek = weekStartMs >= startWeekMs ? 1 + Math.floor(diffWeeks) : Math.ceil(diffWeeks);
  return `Week ${relativeWeek}`;
}

function SummaryTooltipContent({
  payload,
  startWeekMs,
  weekMs,
}: {
  payload: { dataKey?: string | number; value?: number; payload: SummaryChartPoint }[];
  startWeekMs: number | null;
  weekMs: number;
}) {
  const point = payload[0].payload;
  const weekLabel = getRelativeWeekLabel(point, startWeekMs, weekMs);
  return (
    <div className="ui-chart-tooltip ui-chart-tooltip--compact">
      <p className="ui-chart-tooltip__label">{weekLabel}</p>
      <p className="ui-chart-tooltip__meta">
        {formatDate(point.weekStartDateKey)} – {formatDate(point.weekEndDateKey)}
      </p>
      <p className="ui-chart-tooltip__summary">
        Total: {payload.find((entry) => entry.dataKey === "total")?.value ?? 0} · Completed:{" "}
        {payload.find((entry) => entry.dataKey === "completed")?.value ?? 0}
      </p>
    </div>
  );
}

function renderSummaryTooltip(params: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number; payload: SummaryChartPoint }[];
  startWeekMs: number | null;
  weekMs: number;
}) {
  if (!params.active || !params.payload?.length) {
    return null;
  }
  return <SummaryTooltipContent payload={params.payload} startWeekMs={params.startWeekMs} weekMs={params.weekMs} />;
}

function SummaryCumulativeBoundaryLines({
  showStartLine,
  showEndLine,
  projectStartTime,
  projectEndTime,
  deadlineStart,
  deadlineEnd,
}: {
  showStartLine: boolean;
  showEndLine: boolean;
  projectStartTime: number | null;
  projectEndTime: number | null;
  deadlineStart?: string;
  deadlineEnd?: string;
}) {
  return (
    <>
      {showStartLine && projectStartTime != null && deadlineStart ? (
        <ProjectBoundaryReferenceLine x={projectStartTime} color="#0079bf" title="Project starts" dateLabel={formatDate(deadlineStart)} />
      ) : null}
      {showEndLine && projectEndTime != null && deadlineEnd ? (
        <ProjectBoundaryReferenceLine x={projectEndTime} color="#61bd4f" title="Project ends" dateLabel={formatDate(deadlineEnd)} />
      ) : null}
    </>
  );
}

function SummaryCumulativeBars() {
  return (
    <>
      <Bar dataKey="total" name="Total cards" fill="var(--muted-subtle, #97a0af)" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive />
      <Bar dataKey="completed" name="Completed" fill="var(--accent-strong, #61bd4f)" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive />
    </>
  );
}

function SummaryCumulativeChartPlot(props: Props & SummaryBoundaryState & { weekMs: number }) {
  const { containerHandlers, chartHandlers, tooltipProps } = useChartCursorTooltip();

  return (
    <div className="ui-no-select" style={{ width: "100%", height: 320 }} {...containerHandlers}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.chartData} margin={{ top: 40, right: 24, left: 8, bottom: 24 }} barCategoryGap="20%" accessibilityLayer={false} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" />
          <TrelloTimeXAxis domain={props.xAxisDomain} scale="linear" />
          <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(max ?? 0, 1)]} />
          <Tooltip {...tooltipProps} content={({ active, payload }) => renderSummaryTooltip({ active, payload: payload as never, startWeekMs: props.startWeekMs, weekMs: props.weekMs })} />
          <Legend />
          <SummaryCumulativeBoundaryLines showStartLine={props.showStartLine} showEndLine={props.showEndLine} projectStartTime={props.projectStartTime} projectEndTime={props.projectEndTime} deadlineStart={props.deadlineStart} deadlineEnd={props.deadlineEnd} />
          <SummaryCumulativeBars />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SummaryCumulativeChart(props: Props) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const boundary = getSummaryBoundaryState(props);

  return (
    <section className="placeholder stack">
      <h2 className="eyebrow">Project progress</h2>
      <p className="muted">Cumulative tracking of cards completed per week, out of all cards.</p>
      {props.dateRangeSubtitle ? <p className="muted">{props.dateRangeSubtitle}</p> : null}
      {props.chartData.length > 0 ? <SummaryCumulativeChartPlot {...props} {...boundary} weekMs={weekMs} /> : <p className="muted">No data yet.</p>}
    </section>
  );
}
