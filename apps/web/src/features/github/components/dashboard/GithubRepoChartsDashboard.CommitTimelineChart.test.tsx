import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommitTimelineChart } from "./GithubRepoChartsDashboard.CommitTimelineChart";
import {
  formatNumber,
  formatShortDate,
} from "./GithubRepoChartsDashboard.helpers";

vi.mock("@/shared/ui/progress/usePieCursorTooltip", () => ({
  useChartCursorTooltip: () => ({
    containerHandlers: { "data-tooltip-container": "1" },
    chartHandlers: { "data-tooltip-chart": "1" },
    tooltipProps: { "data-tooltip-props": "1" },
  }),
}));

vi.mock("../GithubChartCard", () => ({
  GithubChartCard: ({
    title,
    size,
    children,
  }: {
    title: string;
    size?: "half" | "full";
    children: ReactNode;
  }) => (
    <section data-testid="chart-card" data-size={size}>
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/ui/ChartTooltipContent", () => ({
  ChartTooltipContent: () => <div data-testid="tooltip-content" />,
}));

vi.mock("./GithubRepoChartsDashboard.helpers", () => ({
  CHART_COLOR_COMMITS: "#22aa99",
  formatNumber: vi.fn((value: number) => `num-${value}`),
  formatShortDate: vi.fn((value: string) => `short-${value}`),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="responsive">{children}</div>
  ),
  BarChart: ({ children }: { children?: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="grid" />,
  XAxis: ({
    tickFormatter,
  }: {
    tickFormatter?: (value: string) => string;
  }) => <div data-testid="x-axis">{tickFormatter ? tickFormatter("2026-03-02") : ""}</div>,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: ({
    labelFormatter,
    formatter,
  }: {
    labelFormatter?: (value: unknown) => string;
    formatter?: (value: unknown, name: string) => [string, string];
  }) => (
    <div data-testid="tooltip">
      {labelFormatter ? labelFormatter("2026-03-03") : ""}
      {formatter ? formatter(12, "Commits")[0] : ""}
      {formatter ? formatter(undefined, "Commits")[0] : ""}
    </div>
  ),
  Legend: () => <div data-testid="legend" />,
  Bar: ({
    name,
    maxBarSize,
  }: {
    name?: string;
    maxBarSize?: number;
  }) => <div data-testid="bar">{`${name ?? ""}|${String(maxBarSize ?? "")}`}</div>,
}));

describe("GithubRepoChartsDashboard.CommitTimelineChart", () => {
  it("renders with default options and executes tooltip formatters", () => {
    render(
      <CommitTimelineChart
        title="Commits over time"
        info={{ title: "Info", description: "Desc", bullets: [] }}
        data={[{ date: "2026-03-02", commits: 5 }]}
        minChartWidth={520}
        tickInterval={0}
        barName="All commits"
        barCategoryGap="24%"
        maxBarSize={34}
      />,
    );

    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-size", "full");
    expect(screen.queryByTestId("legend")).not.toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toHaveTextContent("short-2026-03-02");
    expect(screen.getByTestId("tooltip")).toHaveTextContent("short-2026-03-03");
    expect(screen.getByTestId("tooltip")).toHaveTextContent("num-12");
    expect(screen.getByTestId("tooltip")).toHaveTextContent("num-0");
    expect(screen.getByTestId("bar")).toHaveTextContent("All commits|34");

    expect(formatShortDate).toHaveBeenCalled();
    expect(formatNumber).toHaveBeenCalledWith(12);
  });

  it("renders legend and supports explicit card size", () => {
    render(
      <CommitTimelineChart
        title="Branch commits"
        info={{ title: "Info", description: "Desc", bullets: [] }}
        data={[{ date: "2026-03-02", commits: 9 }]}
        minChartWidth={480}
        tickInterval={1}
        barName="Default branch"
        barCategoryGap="18%"
        barGap={2}
        maxBarSize={24}
        showLegend
        size="half"
      />,
    );

    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-size", "half");
    expect(screen.getByTestId("legend")).toBeInTheDocument();
  });
});
