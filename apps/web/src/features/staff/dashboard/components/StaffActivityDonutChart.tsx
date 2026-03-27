"use client";

import { useState, type MouseEvent } from "react";
import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";

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
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>();

  const data = [
    { name: "Active", value: active, fill: COLORS.active },
    { name: "Low activity", value: lowActivity, fill: COLORS.low },
    { name: "Inactive", value: inactive, fill: COLORS.inactive },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return <p className="muted">No team data available.</p>;
  }

  const updateTooltipPosition = (event: MouseEvent<SVGGraphicsElement>) => {
    const svgRoot = event.currentTarget.ownerSVGElement;
    const wrapper = svgRoot?.closest(".recharts-wrapper");
    if (!wrapper) return;

    const bounds = wrapper.getBoundingClientRect();
    setTooltipPosition({
      x: event.clientX - bounds.left + 12,
      y: event.clientY - bounds.top + 12,
    });
  };

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
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
            onMouseMove={(_sector, _index, event) => {
              updateTooltipPosition(event);
            }}
            onMouseLeave={() => {
              setTooltipPosition(undefined);
            }}
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
            isAnimationActive
            content={<ChartTooltipContent />}
            position={tooltipPosition}
            trigger="hover"
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
