import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ContributorBreakdownSection,
  DashboardEmptyState,
  PersonalActivitySection,
} from "./GithubRepoChartsDashboard.ActivitySections";

vi.mock("../GithubContributorCard", () => ({
  GithubContributorCard: ({
    contributor,
    weeklyDenominator,
  }: {
    contributor: { name: string };
    weeklyDenominator?: number;
  }) => (
    <div data-testid="contributor-card">
      {contributor.name}:{weeklyDenominator}
    </div>
  ),
}));

vi.mock("../GithubDonutChartCard", () => ({
  GithubDonutChartCard: ({ title }: { title: string }) => <div data-testid="donut-card">{title}</div>,
}));

vi.mock("./GithubRepoChartsDashboard.AnalyticsCharts", () => ({
  WeeklyCommitTotalsChart: ({ title }: { title: string }) => <div data-testid="weekly-chart">{title}</div>,
}));

vi.mock("./GithubRepoChartsDashboard.CommitTimelineChart", () => ({
  CommitTimelineChart: ({ title }: { title: string }) => <div data-testid="timeline-chart">{title}</div>,
}));

vi.mock("./GithubRepoChartsDashboard.MetricGrid", () => ({
  GithubRepoMetricsGrid: ({ metrics }: { metrics: Array<{ label: string; value: string }> }) => (
    <div data-testid="metric-grid">{metrics.map((metric) => metric.label).join(",")}</div>
  ),
}));

vi.mock("../GithubSectionContainer", () => ({
  GithubSectionContainer: ({ children, title }: { children: ReactNode; title: string }) => (
    <section data-testid="section-container">
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

describe("GithubRepoChartsDashboard.ActivitySections", () => {
  it("renders dashboard empty state", () => {
    render(<DashboardEmptyState />);
    expect(screen.getByText("No chart data available for this snapshot yet.")).toBeInTheDocument();
  });

  it("renders empty and non-empty contributor breakdown states", () => {
    const { rerender } = render(<ContributorBreakdownSection contributors={[]} repositoryFullName={null} />);
    expect(screen.getByText("No chart data available for this snapshot yet.")).toBeInTheDocument();

    rerender(
      <ContributorBreakdownSection
        contributors={[
          {
            key: "c1",
            rank: 1,
            name: "Alice",
            login: "alice",
            commits: 10,
            additions: 40,
            deletions: 10,
            commitsByDay: { "2026-03-01": 2, "2026-03-10": 1 },
          },
          {
            key: "c2",
            rank: 2,
            name: "Bob",
            login: "bob",
            commits: 5,
            additions: 10,
            deletions: 4,
            commitsByDay: { "2026-03-02": 1 },
          },
        ]}
        repositoryFullName="org/repo"
      />,
    );

    expect(screen.getAllByTestId("contributor-card")).toHaveLength(2);
    expect(screen.getByText("Alice:2")).toBeInTheDocument();
    expect(screen.getByText("Bob:2")).toBeInTheDocument();
  });

  it("renders personal activity sections with and without share/trend data", () => {
    const { rerender } = render(
      <PersonalActivitySection
        commitTimelineSeries={[]}
        personalWeeklySeries={[]}
        personalShares={{
          commitShare: [],
          lineShare: [],
          totalCommits: 0,
          totalLineChanges: 0,
          personalCommits: 0,
          personalLineChanges: 0,
        }}
      />,
    );

    expect(screen.getByTestId("section-container")).toBeInTheDocument();
    expect(screen.getByTestId("metric-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("donut-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timeline-chart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("weekly-chart")).not.toBeInTheDocument();

    rerender(
      <PersonalActivitySection
        commitTimelineSeries={[
          { date: "2026-03-01", commits: 8, personalCommits: 3 },
          { date: "2026-03-02", commits: 5 },
        ]}
        personalWeeklySeries={[
          {
            weekKey: "2026-W10",
            weekLabel: "Mar 2-8",
            rangeStart: "2026-03-02",
            rangeEnd: "2026-03-08",
            commits: 4,
          },
        ]}
        personalShares={{
          commitShare: [
            { name: "You", value: 3, fill: "#2f81f7" },
            { name: "Team", value: 10, fill: "#94a3b8" },
          ],
          lineShare: [
            { name: "You", value: 20, fill: "#22c55e" },
            { name: "Team", value: 30, fill: "#94a3b8" },
          ],
          totalCommits: 13,
          totalLineChanges: 50,
          personalCommits: 3,
          personalLineChanges: 20,
        }}
      />,
    );

    expect(screen.getAllByTestId("donut-card")).toHaveLength(2);
    expect(screen.getByTestId("timeline-chart")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-chart")).toBeInTheDocument();
  });
});
