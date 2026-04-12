import type { ReactNode } from "react";

export type GithubDashboardMetric = {
  label: string;
  value: ReactNode;
};

type GithubRepoMetricsGridProps = {
  metrics: GithubDashboardMetric[];
};

export function GithubRepoMetricsGrid({ metrics }: GithubRepoMetricsGridProps) {
  return (
    <div className="github-chart-section__metrics">
      {metrics.map((metric) => (
        <article key={metric.label} className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">{metric.label}</p>
          <p className="github-chart-section__metric-value">{metric.value}</p>
        </article>
      ))}
    </div>
  );
}
