"use client";

import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import { usePieCursorTooltip } from "@/shared/ui/usePieCursorTooltip";

type ActivityDonutProps = {
  active: number;
  lowActivity: number;
  inactive: number;
};

const COLORS = {
  active: "#22c55e",
  low: "#f59e0b",
  inactive: "#ef4444",
};

export function StaffActivityDonutChart({ active, lowActivity, inactive }: ActivityDonutProps) {
  const total = active + lowActivity + inactive;
  const { containerHandlers, pieHandlers, tooltipProps, pieTooltipContentProps } = usePieCursorTooltip();

  const data = [
    { name: "Active", value: active, fill: COLORS.active },
    { name: "Low activity", value: lowActivity, fill: COLORS.low },
    { name: "Inactive", value: inactive, fill: COLORS.inactive },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return <p className="muted">No team data available.</p>;
  }

  return (
    <div
      className="ui-no-select"
      style={{ height: 220 }}
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
            innerRadius={54}
            outerRadius={82}
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive
            rootTabIndex={-1}
            onClick={(_sector, _index, event) => {
              event.stopPropagation();
            }}
            {...pieHandlers}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
            <Label
              position="center"
              value={`${total}`}
              style={{ fill: "var(--ink)", fontSize: "18px", fontWeight: 700 }}
            />
          </Pie>
          <Tooltip
            content={<ChartTooltipContent {...pieTooltipContentProps} />}
            {...tooltipProps}
            formatter={(value, name) => {
              const num = Number(value ?? 0);
              const pct = total > 0 ? ((num / total) * 100).toFixed(0) : "0";
              return [`${num} (${pct}%)`, name];
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: "0.83rem", color: "var(--muted)" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
