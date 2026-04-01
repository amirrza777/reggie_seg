"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import { useChartCursorTooltip } from "@/shared/ui/usePieCursorTooltip";

type ProjectBar = {
  name: string;
  students: number;
};

type StaffStudentsBarChartProps = {
  projects: ProjectBar[];
};

export function StaffStudentsBarChart({ projects }: StaffStudentsBarChartProps) {
  const { containerHandlers, chartHandlers, tooltipProps } = useChartCursorTooltip();

  if (projects.length === 0) {
    return <p className="muted">No project data available.</p>;
  }

  const truncate = (str: string, max = 18) =>
    str.length > max ? `${str.slice(0, max)}…` : str;

  const data = projects.map((p) => ({ ...p, label: truncate(p.name) }));

  const chartHeight = Math.max(160, data.length * 38 + 40);

  return (
    <div className="ui-no-select" style={{ height: chartHeight }} {...containerHandlers}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          accessibilityLayer={false}
          {...chartHandlers}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltipContent className="ui-chart-tooltip--project-names" />}
            formatter={(value, _name, entry) => [value, entry.payload?.name ?? "Students"]}
            labelFormatter={() => ""}
            {...tooltipProps}
          />
          <Bar dataKey="students" radius={[0, 4, 4, 0]} maxBarSize={22} name="Students" fill="#6366f1" isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
