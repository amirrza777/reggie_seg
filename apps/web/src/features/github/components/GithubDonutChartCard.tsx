"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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
