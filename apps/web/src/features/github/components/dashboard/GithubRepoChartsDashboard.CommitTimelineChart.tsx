import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import { useChartCursorTooltip } from "@/shared/ui/usePieCursorTooltip";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GithubChartCard } from "../GithubChartCard";
import type { GithubChartInfoContent } from "../GithubChartInfo";
import {
  CHART_COLOR_COMMITS,
  formatNumber,
  formatShortDate,
} from "./GithubRepoChartsDashboard.helpers";

type CommitTimelineChartProps = {
  title: string;
  info: GithubChartInfoContent;
  data: Array<{ date: string; commits: number }>;
  minChartWidth: number;
  tickInterval: number;
  barName: string;
  barCategoryGap: string;
  barGap?: number;
  maxBarSize: number;
  showLegend?: boolean;
  size?: "half" | "full";
};

export function CommitTimelineChart({
  title,
  info,
  data,
  minChartWidth,
  tickInterval,
  barName,
  barCategoryGap,
  barGap,
  maxBarSize,
  showLegend = false,
  size = "full",
}: CommitTimelineChartProps) {
  const {
    containerHandlers: timelineContainerHandlers,
    chartHandlers: timelineChartHandlers,
    tooltipProps: timelineTooltipProps,
  } = useChartCursorTooltip();

  return (
    <GithubChartCard title={title} info={info} size={size} minChartWidth={minChartWidth}>
      <div
        className="github-chart-section__canvas github-chart-section__canvas--xl ui-no-select"
        {...timelineContainerHandlers}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 6, bottom: 6 }}
            barCategoryGap={barCategoryGap}
            barGap={barGap}
            accessibilityLayer={false}
            {...timelineChartHandlers}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted)" }}
              width={42}
              axisLine={false}
              tickLine={false}
              label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
            />
            <Tooltip
              {...timelineTooltipProps}
              content={<ChartTooltipContent />}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value, name) => [formatNumber(Number(value ?? 0)), name]}
            />
            {showLegend ? <Legend align="right" verticalAlign="top" iconType="circle" iconSize={8} /> : null}
            <Bar
              dataKey="commits"
              name={barName}
              fill={CHART_COLOR_COMMITS}
              radius={[4, 4, 0, 0]}
              maxBarSize={maxBarSize}
              animationDuration={300}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GithubChartCard>
  );
}
