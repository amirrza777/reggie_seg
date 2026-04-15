import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  RepositoryAnalyticsCharts,
  WeeklyCommitTotalsChart,
} from "./GithubRepoChartsDashboard.AnalyticsCharts";

vi.mock("@/shared/ui/progress/usePieCursorTooltip", () => ({
  useChartCursorTooltip: () => ({
    containerHandlers: { "data-tooltip-container": "1" },
    chartHandlers: { "data-tooltip-chart": "1" },
    tooltipProps: { "data-tooltip-props": "1" },
  }),
}));

vi.mock("../GithubChartCard", () => ({
  GithubChartCard: ({ title, children }: { title: string; children: ReactNode }) => (
    <section data-testid="chart-card">
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock("./GithubRepoChartsDashboard.CommitTimelineChart", () => ({
  CommitTimelineChart: ({ title }: { title: string }) => <div data-testid="commit-timeline">{title}</div>,
}));

vi.mock("@/shared/ui/ChartTooltipContent", () => ({
  ChartTooltipContent: () => <div data-testid="tooltip-content" />,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="responsive">{children}</div>
  ),
  BarChart: ({ children }: { children?: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="grid" />,
  Legend: () => <div data-testid="legend" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: ({ domain }: { domain?: Array<number | ((value: number) => number)> }) => (
    <div data-testid="y-axis">
      {typeof domain?.[1] === "function" ? `${domain[1](-1)}|${domain[1](10)}` : ""}
    </div>
  ),
  Tooltip: ({
    labelFormatter,
    formatter,
  }: {
    labelFormatter?: (label: unknown, payload?: Array<{ payload?: unknown }>) => string;
    formatter?: (value: unknown, name: string) => [string, string];
  }) => (
    <div data-testid="tooltip">
      {labelFormatter
        ? labelFormatter("2026-03-02", [{ payload: { weekKey: "2026-W10", rangeStart: "2026-03-02", rangeEnd: "2026-03-08" } } as any])
        : ""}
      {labelFormatter ? labelFormatter("2026-03-02", []) : ""}
      {formatter ? formatter(1234, "Commits")[0] : ""}
    </div>
  ),
  Bar: () => <div data-testid="bar" />,
}));

describe("GithubRepoChartsDashboard.AnalyticsCharts", () => {
  it("renders weekly commit totals chart and executes weekly tooltip formatters", () => {
    render(
      <WeeklyCommitTotalsChart
        title="Weekly"
        info={{ title: "Info", description: "Desc", bullets: [] }}
        data={[
          {
            weekKey: "2026-W10",
            weekLabel: "Mar 2-8",
            rangeStart: "2026-03-02",
            rangeEnd: "2026-03-08",
            commits: 9,
          },
        ]}
        minChartWidth={520}
        tickInterval={0}
      />,
    );

    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip").textContent).toContain("Week 2026-W10:");
    expect(screen.getByTestId("tooltip").textContent).toContain("Week");
    expect(screen.getByTestId("tooltip").textContent).toContain("1,234");
    expect(screen.getByTestId("y-axis").textContent).toContain("4|12");
  });

  it("renders analytics sections for both populated and empty datasets", () => {
    const { rerender } = render(
      <RepositoryAnalyticsCharts
        commitTimelineSeries={[
          { date: "2026-03-01", commits: 5, personalCommits: 2 },
        ]}
        lineChangesByDaySeries={[
          { date: "2026-03-01", additions: 50, deletions: -10 },
        ]}
        weeklyCommitSeries={[
          {
            weekKey: "2026-W10",
            weekLabel: "Mar 2-8",
            rangeStart: "2026-03-02",
            rangeEnd: "2026-03-08",
            commits: 5,
          },
        ]}
        lineChangeDomain={[-100, 100]}
      />,
    );

    expect(screen.getByTestId("commit-timeline")).toHaveTextContent("Commits over time");
    expect(screen.getByText("Additions and deletions over time")).toBeInTheDocument();
    expect(screen.getByText("Weekly commit totals")).toBeInTheDocument();

    rerender(
      <RepositoryAnalyticsCharts
        commitTimelineSeries={[]}
        lineChangesByDaySeries={[]}
        weeklyCommitSeries={[]}
        lineChangeDomain={undefined}
      />,
    );

    expect(screen.queryByTestId("commit-timeline")).not.toBeInTheDocument();
    expect(screen.queryByText("Additions and deletions over time")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly commit totals")).not.toBeInTheDocument();
  });
});
