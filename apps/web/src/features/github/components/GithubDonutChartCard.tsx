"use client";

import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { GithubChartTitleWithInfo, type GithubChartInfoContent } from "./GithubChartInfo";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import { usePieCursorTooltip } from "@/shared/ui/progress/usePieCursorTooltip";

type DonutDatum = {
  name: string;
  value: number;
  fill: string;
};

type GithubDonutChartCardProps = {
  title: string;
  data: DonutDatum[];
  info?: GithubChartInfoContent;
  className?: string;
};

export function GithubDonutChartCard({ title, data, info, className }: GithubDonutChartCardProps) {
  const { containerHandlers, pieHandlers, tooltipProps, pieTooltipContentProps } =
    usePieCursorTooltip({ offsetY: -18 });

  if (!data.length) {
    return null;
  }

  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className={className}>
      {info ? <GithubChartTitleWithInfo title={title} info={info} /> : <p className="muted github-chart-section__label">{title}</p>}
      <div
        className="github-chart-section__canvas github-chart-section__canvas--md ui-no-select"
        {...containerHandlers}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer={false}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={90}
              paddingAngle={2}
              isAnimationActive
              rootTabIndex={-1}
              label={({ percent }) => `${(Number(percent || 0) * 100).toFixed(1)}%`}
              labelLine={false}
              {...pieHandlers}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <Label
                position="center"
                value={total.toLocaleString()}
                style={{
                  fill: "var(--ink)",
                  fontSize: "var(--fs-fixed-16px)",
                  fontWeight: 700,
                }}
              />
            </Pie>
            <Tooltip
              content={<ChartTooltipContent {...pieTooltipContentProps} />}
              {...tooltipProps}
              formatter={(value, name) => {
                const numericValue = Number(value || 0);
                const percentage = total > 0 ? ((numericValue / total) * 100).toFixed(1) : "0.0";
                return [`${numericValue.toLocaleString()} (${percentage}%)`, name];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
