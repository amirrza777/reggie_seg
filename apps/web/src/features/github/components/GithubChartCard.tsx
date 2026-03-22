import type { ReactNode } from "react";
import { GithubChartTitleWithInfo, type GithubChartInfoContent } from "./GithubChartInfo";

type GithubChartCardProps = {
  title: string;
  info?: GithubChartInfoContent;
  size?: "full" | "half";
  minChartWidth?: number;
  className?: string;
  children: ReactNode;
};

export function GithubChartCard({
  title,
  info,
  size = "half",
  minChartWidth,
  className,
  children,
}: GithubChartCardProps) {
  const sizeClass = size === "full" ? "github-chart-section__panel--full" : "github-chart-section__panel--half";

  return (
    <div className={`github-chart-section__panel ${sizeClass}${className ? ` ${className}` : ""}`}>
      {info ? <GithubChartTitleWithInfo title={title} info={info} /> : <p className="github-chart-title__text">{title}</p>}
      <div className="github-chart-section__chart-scroll">
        <div
          className="github-chart-section__chart-surface"
          style={minChartWidth ? { minWidth: `${minChartWidth}px` } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
