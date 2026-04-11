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

const MIN_PROJECT_LABEL_AXIS_WIDTH = 140;
const MAX_PROJECT_LABEL_AXIS_WIDTH = 280;
const PROJECT_LABEL_AXIS_PADDING = 8;
const APPROX_PROJECT_LABEL_CHAR_WIDTH = 6;
const MAX_PROJECT_LABEL_LENGTH = 46;
const PROJECT_LABEL_FONT = "400 11px sans-serif";

let projectLabelMeasureContext: CanvasRenderingContext2D | null | undefined;

function truncateProjectLabel(str: string, max = MAX_PROJECT_LABEL_LENGTH) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function buildProjectBarData(projects: ProjectBar[]) {
  return projects.map((project) => ({ ...project, label: truncateProjectLabel(project.name) }));
}

function resolveProjectLabelMeasureContext() {
  if (typeof document === "undefined") {
    return null;
  }
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return null;
  }
  if (projectLabelMeasureContext !== undefined) {
    return projectLabelMeasureContext;
  }
  try {
    const canvas = document.createElement("canvas");
    projectLabelMeasureContext = canvas.getContext("2d");
    if (projectLabelMeasureContext) {
      projectLabelMeasureContext.font = PROJECT_LABEL_FONT;
    }
  } catch {
    projectLabelMeasureContext = null;
  }
  return projectLabelMeasureContext;
}

function measureProjectLabelWidth(label: string) {
  const context = resolveProjectLabelMeasureContext();
  if (!context) {
    return label.length * APPROX_PROJECT_LABEL_CHAR_WIDTH;
  }
  return context.measureText(label).width;
}

function resolveProjectLabelAxisWidth(data: ReturnType<typeof buildProjectBarData>) {
  const estimatedWidth =
    data.reduce((max, project) => Math.max(max, measureProjectLabelWidth(project.label)), 0) + PROJECT_LABEL_AXIS_PADDING;
  return Math.min(MAX_PROJECT_LABEL_AXIS_WIDTH, Math.max(MIN_PROJECT_LABEL_AXIS_WIDTH, estimatedWidth));
}

function resolveStaffStudentsChartHeight(dataLength: number) {
  return Math.max(160, dataLength * 38 + 40);
}

function StaffStudentsBarChartBody({
  data,
  yAxisWidth,
  chartHeight,
  containerHandlers,
  chartHandlers,
  tooltipProps,
}: {
  data: ReturnType<typeof buildProjectBarData>;
  yAxisWidth: number;
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
          <YAxis
            type="category"
            dataKey="label"
            width={yAxisWidth}
            tick={{ fill: "var(--muted)", fontSize: "var(--fs-fixed-11px)" }}
            axisLine={false}
            tickLine={false}
          />
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
  const yAxisWidth = resolveProjectLabelAxisWidth(data);
  const chartHeight = resolveStaffStudentsChartHeight(data.length);
  return (
    <StaffStudentsBarChartBody
      data={data}
      yAxisWidth={yAxisWidth}
      chartHeight={chartHeight}
      containerHandlers={containerHandlers}
      chartHandlers={chartHandlers}
      tooltipProps={tooltipProps}
    />
  );
}
