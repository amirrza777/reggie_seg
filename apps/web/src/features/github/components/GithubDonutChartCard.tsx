"use client";

import type React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type DonutDatum = {
  name: string;
  value: number;
  fill: string;
};

type GithubDonutChartCardProps = {
  title: string;
  data: DonutDatum[];
  style?: React.CSSProperties;
};

export function GithubDonutChartCard({ title, data, style }: GithubDonutChartCardProps) {
  if (!data.length) {
    return null;
  }

  return (
    <div style={style}>
      <p className="muted" style={{ marginBottom: 6 }}>{title}</p>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={76}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
