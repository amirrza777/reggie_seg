"use client";

import type { CSSProperties } from "react";
import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import { usePieCursorTooltip } from "@/shared/ui/usePieCursorTooltip";

type ActivityDonutProps = {
  active: number;
  lowActivity: number;
  inactive: number;
};

const COLORS = { active: "#22c55e", low: "#f59e0b", inactive: "#ef4444" };
const STAFF_ACTIVITY_DONUT_HEIGHT = 220;
const STAFF_ACTIVITY_DONUT_STYLE: CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: STAFF_ACTIVITY_DONUT_HEIGHT,
  height: STAFF_ACTIVITY_DONUT_HEIGHT,
};

function buildActivityData(active: number, lowActivity: number, inactive: number) {
  return [{ name: "Active", value: active, fill: COLORS.active }, { name: "Low activity", value: lowActivity, fill: COLORS.low }, { name: "Inactive", value: inactive, fill: COLORS.inactive }].filter((entry) => entry.value > 0);
}

function formatActivityDonutTooltip(value: unknown, name: unknown, total: number) {
  const num = Number(value ?? 0);
  const pct = total > 0 ? ((num / total) * 100).toFixed(0) : "0";
  return [`${num} (${pct}%)`, name];
}

function StaffActivityDonutChartBody({
  total,
  data,
  containerHandlers,
  pieHandlers,
  tooltipProps,
  pieTooltipContentProps,
}: {
  total: number;
  data: ReturnType<typeof buildActivityData>;
  containerHandlers: ReturnType<typeof usePieCursorTooltip>["containerHandlers"];
  pieHandlers: ReturnType<typeof usePieCursorTooltip>["pieHandlers"];
  tooltipProps: ReturnType<typeof usePieCursorTooltip>["tooltipProps"];
  pieTooltipContentProps: ReturnType<typeof usePieCursorTooltip>["pieTooltipContentProps"];
}) {
  return (
    <div className="ui-no-select" style={STAFF_ACTIVITY_DONUT_STYLE} {...containerHandlers}>
      <ResponsiveContainer
        width="100%"
        height={STAFF_ACTIVITY_DONUT_HEIGHT}
        minWidth={0}
        initialDimension={{ width: 1, height: STAFF_ACTIVITY_DONUT_HEIGHT }}
      >
        <PieChart accessibilityLayer={false}>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive rootTabIndex={-1} onClick={(_sector, _index, event) => { event.stopPropagation(); }} {...pieHandlers}>
            {data.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
            <Label position="center" value={`${total}`} style={{ fill: "var(--ink)", fontSize: "var(--fs-fixed-18px)", fontWeight: 700 }} />
          </Pie>
          <Tooltip content={<ChartTooltipContent {...pieTooltipContentProps} />} {...tooltipProps} formatter={(value, name) => formatActivityDonutTooltip(value, name, total)} />
          <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: "var(--fs-fixed-0-83rem)", color: "var(--muted)" }}>{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StaffActivityDonutChart({ active, lowActivity, inactive }: ActivityDonutProps) {
  const total = active + lowActivity + inactive;
  const { containerHandlers, pieHandlers, tooltipProps, pieTooltipContentProps } = usePieCursorTooltip();
  const data = buildActivityData(active, lowActivity, inactive);
  if (data.length === 0) {
    return <p className="muted">No team data available.</p>;
  }
  return <StaffActivityDonutChartBody total={total} data={data} containerHandlers={containerHandlers} pieHandlers={pieHandlers} tooltipProps={tooltipProps} pieTooltipContentProps={pieTooltipContentProps} />;
}
