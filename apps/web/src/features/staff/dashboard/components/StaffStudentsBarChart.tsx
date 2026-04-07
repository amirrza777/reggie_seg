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

function truncateProjectLabel(str: string, max = 18) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function buildProjectBarData(projects: ProjectBar[]) {
  return projects.map((project) => ({ ...project, label: truncateProjectLabel(project.name) }));
}

function resolveStaffStudentsChartHeight(dataLength: number) {
  return Math.max(160, dataLength * 38 + 40);
}

function StaffStudentsBarChartBody({
  data,
  chartHeight,
  containerHandlers,
  chartHandlers,
  tooltipProps,
}: {
  data: ReturnType<typeof buildProjectBarData>;
  chartHeight: number;
  containerHandlers: ReturnType<typeof useChartCursorTooltip>["containerHandlers"];
  chartHandlers: ReturnType<typeof useChartCursorTooltip>["chartHandlers"];
  tooltipProps: ReturnType<typeof useChartCursorTooltip>["tooltipProps"];
}) {
  return (
    <div className="ui-no-select" style={{ height: chartHeight }} {...containerHandlers}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} accessibilityLayer={false} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: "var(--fs-fixed-11px)" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={100} tick={{ fill: "var(--muted)", fontSize: "var(--fs-fixed-11px)" }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltipContent className="ui-chart-tooltip--project-names" />} formatter={(value, _name, entry) => [value, entry.payload?.name ?? "Students"]} labelFormatter={() => ""} {...tooltipProps} />
          <Bar dataKey="students" radius={[0, 4, 4, 0]} maxBarSize={22} name="Students" fill="#6366f1" isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StaffStudentsBarChart({ projects }: StaffStudentsBarChartProps) {
  const { containerHandlers, chartHandlers, tooltipProps } = useChartCursorTooltip();
  if (projects.length === 0) {
    return <p className="muted">No project data available.</p>;
  }
  const data = buildProjectBarData(projects);
  const chartHeight = resolveStaffStudentsChartHeight(data.length);
  return <StaffStudentsBarChartBody data={data} chartHeight={chartHeight} containerHandlers={containerHandlers} chartHandlers={chartHandlers} tooltipProps={tooltipProps} />;
}
