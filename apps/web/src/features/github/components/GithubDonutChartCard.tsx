"use client";

import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { GithubChartTitleWithInfo, type GithubChartInfoContent } from "./GithubChartInfo";

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
  if (!data.length) {
    return null;
  }

  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className={className}>
      {info ? <GithubChartTitleWithInfo title={title} info={info} /> : <p className="muted github-chart-section__label">{title}</p>}
      <div className="github-chart-section__canvas github-chart-section__canvas--md">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={90}
              paddingAngle={2}
              label={({ percent }) => `${(Number(percent || 0) * 100).toFixed(1)}%`}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <Label
                position="center"
                value={total.toLocaleString()}
                style={{
                  fill: "var(--ink)",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
              />
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const numericValue = Number(value || 0);
                const percentage = total > 0 ? ((numericValue / total) * 100).toFixed(1) : "0.0";
                return [`${numericValue.toLocaleString()} (${percentage}%)`, name];
              }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--ink)",
              }}
              itemStyle={{ color: "var(--ink)" }}
              labelStyle={{ color: "var(--ink)" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
