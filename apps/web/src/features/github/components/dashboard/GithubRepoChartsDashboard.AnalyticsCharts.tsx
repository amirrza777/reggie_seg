"use client";

import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import { useChartCursorTooltip } from "@/shared/ui/progress/usePieCursorTooltip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GithubChartInfoContent } from "../GithubChartInfo";
import { GithubChartCard } from "../GithubChartCard";
import { CommitTimelineChart } from "./GithubRepoChartsDashboard.CommitTimelineChart";
import { githubRepoChartInfo as chartInfo } from "./GithubRepoChartsDashboard.info";
import {
  CHART_COLOR_ADDITIONS,
  CHART_COLOR_COMMITS,
  CHART_COLOR_DELETIONS,
  formatDateRange,
  formatNumber,
  formatShortDate,
  getChartMinWidth,
  getDateTickInterval,
} from "./GithubRepoChartsDashboard.helpers";

type CommitTimelineRow = { date: string; commits: number; personalCommits?: number };
type LineChangesRow = { date: string; additions: number; deletions: number };
type WeeklyCommitRow = {
  weekKey: string;
  weekLabel: string;
  rangeStart: string;
  rangeEnd: string;
  commits: number;
};

type CursorTooltipState = ReturnType<typeof useChartCursorTooltip>;
type SharedChartProps = Pick<CursorTooltipState, "chartHandlers" | "tooltipProps">;

function resolveCommitAxisMax(dataMax: number) {
  const numeric = Number(dataMax);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 4;
  }
  return Math.max(4, Math.ceil(numeric * 1.12));
}

function WeeklyChartXAxis({ tickInterval }: { tickInterval: number }) {
  return (
    <XAxis
      dataKey="weekLabel"
      interval={tickInterval}
      tickMargin={12}
      tick={{ fill: "var(--muted)", fontSize: "var(--fs-fixed-11px)" }}
      minTickGap={14}
      axisLine={false}
      tickLine={false}
    />
  );
}

function WeeklyChartYAxis() {
  return (
    <YAxis
      allowDecimals={false}
      domain={[0, resolveCommitAxisMax]}
      tick={{ fill: "var(--muted)" }}
      width={42}
      axisLine={false}
      tickLine={false}
      label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
    />
  );
}

function WeeklyChartTooltip({ tooltipProps }: Pick<CursorTooltipState, "tooltipProps">) {
  return (
    <Tooltip
      {...tooltipProps}
      content={<ChartTooltipContent />}
      labelFormatter={(_, payload) => {
        const row = payload?.[0]?.payload as { weekKey?: string; rangeStart?: string; rangeEnd?: string } | undefined;
        if (row?.rangeStart && row?.rangeEnd) {
          return `Week ${row.weekKey ?? ""}: ${formatDateRange(row.rangeStart, row.rangeEnd)}`;
        }
        return "Week";
      }}
      formatter={(value) => [formatNumber(Number(value ?? 0)), "Commits"]}
    />
  );
}

function WeeklyChartBars() {
  return (
    <Bar
      dataKey="commits"
      name="Commits"
      fill={CHART_COLOR_COMMITS}
      radius={[6, 6, 0, 0]}
      minPointSize={2}
      animationDuration={420}
      isAnimationActive
    />
  );
}

function WeeklyCommitBarChart({ data, tickInterval, chartHandlers, tooltipProps }: SharedChartProps & { data: WeeklyCommitRow[]; tickInterval: number; }) {
  return (
    <BarChart
      data={data}
      margin={{ top: 8, right: 8, left: 6, bottom: 6 }}
      barCategoryGap="12%"
      barGap={0}
      accessibilityLayer={false}
      {...chartHandlers}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <WeeklyChartXAxis tickInterval={tickInterval} />
      <WeeklyChartYAxis />
      <WeeklyChartTooltip tooltipProps={tooltipProps} />
      <WeeklyChartBars />
    </BarChart>
  );
}

function WeeklyCommitChartCanvas({ data, minChartWidth, tickInterval, containerHandlers, chartHandlers, tooltipProps }: SharedChartProps & Pick<CursorTooltipState, "containerHandlers"> & { data: WeeklyCommitRow[]; minChartWidth: number; tickInterval: number; }) {
  return (
    <div className="github-chart-section__canvas github-chart-section__canvas--weekly ui-no-select" {...containerHandlers}>
      <ResponsiveContainer width="100%" height="100%" minWidth={minChartWidth}>
        <WeeklyCommitBarChart
          data={data}
          tickInterval={tickInterval}
          chartHandlers={chartHandlers}
          tooltipProps={tooltipProps}
        />
      </ResponsiveContainer>
    </div>
  );
}

type WeeklyCommitTotalsChartProps = {
  title: string;
  info: GithubChartInfoContent;
  data: WeeklyCommitRow[];
  minChartWidth: number;
  tickInterval: number;
  size?: "half" | "full";
};

export function WeeklyCommitTotalsChart({ title, info, data, minChartWidth, tickInterval, size = "half" }: WeeklyCommitTotalsChartProps) {
  const { containerHandlers, chartHandlers, tooltipProps } = useChartCursorTooltip();
  return (
    <GithubChartCard title={title} info={info} size={size} minChartWidth={minChartWidth}>
      <WeeklyCommitChartCanvas
        data={data}
        minChartWidth={minChartWidth}
        tickInterval={tickInterval}
        containerHandlers={containerHandlers}
        chartHandlers={chartHandlers}
        tooltipProps={tooltipProps}
      />
    </GithubChartCard>
  );
}

function LineChangeChartXAxis({ tickInterval }: { tickInterval: number }) {
  return (
    <XAxis
      dataKey="date"
      interval={tickInterval}
      tickMargin={12}
      tick={{ fill: "var(--muted)", fontSize: "var(--fs-fixed-11px)" }}
      tickFormatter={formatShortDate}
      minTickGap={18}
      axisLine={false}
      tickLine={false}
    />
  );
}

function LineChangeChartYAxis({ lineChangeDomain }: { lineChangeDomain: readonly [number, number] | undefined }) {
  return (
    <YAxis
      domain={lineChangeDomain}
      tick={{ fill: "var(--muted)" }}
      width={54}
      axisLine={false}
      tickLine={false}
      label={{ value: "Lines changed", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
    />
  );
}

function LineChangeChartTooltip({ tooltipProps }: Pick<CursorTooltipState, "tooltipProps">) {
  return (
    <Tooltip
      {...tooltipProps}
      content={<ChartTooltipContent />}
      labelFormatter={(label) => formatShortDate(String(label))}
      formatter={(value, name) => [Math.abs(Number(value ?? 0)).toLocaleString(), name]}
    />
  );
}

function LineChangeChartBars() {
  return (
    <>
      <Legend align="right" verticalAlign="top" iconType="circle" iconSize={8} />
      <Bar dataKey="additions" name="Additions" fill={CHART_COLOR_ADDITIONS} radius={[4, 4, 0, 0]} maxBarSize={14} animationDuration={420} isAnimationActive />
      <Bar dataKey="deletions" name="Deletions" fill={CHART_COLOR_DELETIONS} radius={[4, 4, 0, 0]} maxBarSize={14} animationDuration={420} isAnimationActive />
    </>
  );
}

function LineChangesBarChart({ data, lineChangeDomain, chartHandlers, tooltipProps, tickInterval }: SharedChartProps & { data: LineChangesRow[]; lineChangeDomain: readonly [number, number] | undefined; tickInterval: number; }) {
  return (
    <BarChart
      data={data}
      margin={{ top: 8, right: 8, left: 6, bottom: 6 }}
      barCategoryGap="24%"
      barGap={0}
      accessibilityLayer={false}
      {...chartHandlers}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <LineChangeChartXAxis tickInterval={tickInterval} />
      <LineChangeChartYAxis lineChangeDomain={lineChangeDomain} />
      <LineChangeChartTooltip tooltipProps={tooltipProps} />
      <LineChangeChartBars />
    </BarChart>
  );
}

function LineChangesChartCanvas({ data, lineChangeDomain, minChartWidth, tickInterval, containerHandlers, chartHandlers, tooltipProps }: SharedChartProps & Pick<CursorTooltipState, "containerHandlers"> & { data: LineChangesRow[]; lineChangeDomain: readonly [number, number] | undefined; minChartWidth: number; tickInterval: number; }) {
  return (
    <div className="github-chart-section__canvas github-chart-section__canvas--xl ui-no-select" {...containerHandlers}>
      <ResponsiveContainer width="100%" height="100%" minWidth={minChartWidth}>
        <LineChangesBarChart
          data={data}
          lineChangeDomain={lineChangeDomain}
          tickInterval={tickInterval}
          chartHandlers={chartHandlers}
          tooltipProps={tooltipProps}
        />
      </ResponsiveContainer>
    </div>
  );
}

type LineChangesTimelineChartProps = {
  title: string;
  data: LineChangesRow[];
  lineChangeDomain: readonly [number, number] | undefined;
  minChartWidth: number;
  tickInterval: number;
  size?: "half" | "full";
};

function LineChangesTimelineChart({ title, data, lineChangeDomain, minChartWidth, tickInterval, size = "full" }: LineChangesTimelineChartProps) {
  const { containerHandlers, chartHandlers, tooltipProps } = useChartCursorTooltip();
  return (
    <GithubChartCard title={title} info={chartInfo.lineChanges} size={size} minChartWidth={minChartWidth}>
      <LineChangesChartCanvas
        data={data}
        lineChangeDomain={lineChangeDomain}
        minChartWidth={minChartWidth}
        tickInterval={tickInterval}
        containerHandlers={containerHandlers}
        chartHandlers={chartHandlers}
        tooltipProps={tooltipProps}
      />
    </GithubChartCard>
  );
}

type AnalyticsLayout = {
  commitMinWidth: number;
  commitTickInterval: number;
  linesMinWidth: number;
  lineTickInterval: number;
  weeklyMinWidth: number;
  weeklyTickInterval: number;
};

function buildAnalyticsLayout(commitCount: number, lineCount: number, weeklyCount: number): AnalyticsLayout {
  return {
    commitMinWidth: getChartMinWidth(commitCount, { base: 640, pointWidth: 28, max: 1500 }),
    commitTickInterval: getDateTickInterval(commitCount, { maxTicks: 9 }),
    linesMinWidth: getChartMinWidth(lineCount, { base: 640, pointWidth: 24, max: 1500 }),
    lineTickInterval: getDateTickInterval(lineCount, { maxTicks: 9 }),
    weeklyMinWidth: getChartMinWidth(weeklyCount, { base: 520, pointWidth: 60, max: 980 }),
    weeklyTickInterval: getDateTickInterval(weeklyCount, { maxTicks: 12 }),
  };
}

function TeamCommitTimeline({ data, minChartWidth, tickInterval }: { data: CommitTimelineRow[]; minChartWidth: number; tickInterval: number; }) {
  if (data.length <= 0) {
    return null;
  }
  return (
    <CommitTimelineChart
      title="Commits over time"
      info={chartInfo.commitsTimeline}
      data={data}
      minChartWidth={minChartWidth}
      tickInterval={tickInterval}
      barName="Team commits"
      barCategoryGap="26%"
      barGap={2}
      maxBarSize={12}
      showLegend
      size="full"
    />
  );
}

function TeamLineChanges({ data, lineChangeDomain, minChartWidth, tickInterval }: { data: LineChangesRow[]; lineChangeDomain: readonly [number, number] | undefined; minChartWidth: number; tickInterval: number; }) {
  if (data.length <= 0) {
    return null;
  }
  return (
    <LineChangesTimelineChart
      title="Additions and deletions over time"
      data={data}
      lineChangeDomain={lineChangeDomain}
      minChartWidth={minChartWidth}
      tickInterval={tickInterval}
      size="full"
    />
  );
}

function TeamWeeklyCommits({ data, minChartWidth, tickInterval }: { data: WeeklyCommitRow[]; minChartWidth: number; tickInterval: number; }) {
  if (data.length <= 0) {
    return null;
  }
  return (
    <WeeklyCommitTotalsChart
      title="Weekly commit totals"
      info={chartInfo.weeklyCommits}
      data={data}
      minChartWidth={minChartWidth}
      tickInterval={tickInterval}
      size="half"
    />
  );
}

type RepositoryAnalyticsChartsProps = {
  commitTimelineSeries: CommitTimelineRow[];
  lineChangesByDaySeries: LineChangesRow[];
  weeklyCommitSeries: WeeklyCommitRow[];
  lineChangeDomain: readonly [number, number] | undefined;
};

export function RepositoryAnalyticsCharts({ commitTimelineSeries, lineChangesByDaySeries, weeklyCommitSeries, lineChangeDomain }: RepositoryAnalyticsChartsProps) {
  const layout = buildAnalyticsLayout(
    commitTimelineSeries.length,
    lineChangesByDaySeries.length,
    weeklyCommitSeries.length
  );
  return (
    <div className="github-chart-section__grid">
      <TeamCommitTimeline data={commitTimelineSeries} minChartWidth={layout.commitMinWidth} tickInterval={layout.commitTickInterval} />
      <TeamLineChanges data={lineChangesByDaySeries} lineChangeDomain={lineChangeDomain} minChartWidth={layout.linesMinWidth} tickInterval={layout.lineTickInterval} />
      <TeamWeeklyCommits data={weeklyCommitSeries} minChartWidth={layout.weeklyMinWidth} tickInterval={layout.weeklyTickInterval} />
    </div>
  );
}
