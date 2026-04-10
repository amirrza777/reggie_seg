import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SummaryCumulativeChart } from "./SummaryCumulativeChart";
import type { SummaryChartPoint } from "@/features/trello/lib/summaryChartData";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: ({
    content,
  }: {
    content?: (p: { active?: boolean; payload?: unknown[] }) => ReactNode;
  }) => {
    if (typeof content !== "function") return null;
    const g = globalThis as {
      __trelloSummaryTooltipPayload?: { dataKey?: string; value?: number; payload: SummaryChartPoint }[];
    };
    const payload = g.__trelloSummaryTooltipPayload;
    const inactive = content({ active: false, payload: [{ payload: {} }] as never });
    const empty = content({ active: true, payload: [] });
    const filled = content({ active: true, payload: payload as never });
    return (
      <div data-testid="tooltip-probe">
        <div data-testid="tooltip-inactive">{inactive}</div>
        <div data-testid="tooltip-empty">{empty}</div>
        <div data-testid="tooltip-filled">{filled}</div>
      </div>
    );
  },
  Legend: () => null,
  ReferenceLine: ({ x }: { x?: number }) => <div data-testid="reference-line" data-x={x} />,
}));

afterEach(() => {
  delete (globalThis as { __trelloSummaryTooltipPayload?: unknown }).__trelloSummaryTooltipPayload;
});

describe("SummaryCumulativeChart", () => {
  const wideDomain: [number, number] = [
    new Date("2024-01-01T12:00:00Z").getTime(),
    new Date("2024-02-20T12:00:00Z").getTime(),
  ];

  it("shows no data when chartData is empty", () => {
    render(
      <SummaryCumulativeChart
        chartData={[]}
        dateRangeSubtitle={null}
        xAxisDomain={wideDomain}
        projectStartTime={null}
        projectEndTime={null}
      />,
    );
    expect(screen.getByText("No data yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
  });

  it("renders bar chart and optional subtitle when there is data", () => {
    const chartData: SummaryChartPoint[] = [
      {
        week: "W1",
        weekKey: "2024-01-01",
        time: new Date("2024-01-04T12:00:00Z").getTime(),
        weekStartDateKey: "2024-01-01",
        weekEndDateKey: "2024-01-07",
        total: 3,
        completed: 1,
      },
    ];
    render(
      <SummaryCumulativeChart
        chartData={chartData}
        dateRangeSubtitle="Jan – Mar 2024"
        xAxisDomain={wideDomain}
        projectStartTime={null}
        projectEndTime={null}
      />,
    );
    expect(screen.getByText("Jan – Mar 2024")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("exercises tooltip branches and week label when project start is unknown", () => {
    const point: SummaryChartPoint = {
      week: "Plain week label",
      weekKey: "2024-01-08",
      time: new Date("2024-01-10T12:00:00Z").getTime(),
      weekStartDateKey: "2024-01-08",
      weekEndDateKey: "2024-01-14",
      total: 4,
      completed: 2,
    };
    (globalThis as { __trelloSummaryTooltipPayload?: unknown }).__trelloSummaryTooltipPayload = [
      { dataKey: "total", value: 4, payload: point },
      { dataKey: "completed", value: 2, payload: point },
    ];
    render(
      <SummaryCumulativeChart
        chartData={[point]}
        dateRangeSubtitle={null}
        xAxisDomain={wideDomain}
        projectStartTime={null}
        projectEndTime={null}
      />,
    );
    expect(screen.getByTestId("tooltip-inactive")).toBeEmptyDOMElement();
    expect(screen.getByTestId("tooltip-empty")).toBeEmptyDOMElement();
    expect(screen.getByTestId("tooltip-filled")).toHaveTextContent("Plain week label");
    expect(screen.getByTestId("tooltip-filled")).toHaveTextContent("Total: 4");
    expect(screen.getByTestId("tooltip-filled")).toHaveTextContent("Completed: 2");
  });

  it("uses relative week labels when deadline start aligns with project start", () => {
    const projectStartTime = new Date("2024-01-10T12:00:00Z").getTime();
    const point: SummaryChartPoint = {
      week: "ignored when relative",
      weekKey: "2024-01-15",
      time: new Date("2024-01-17T12:00:00Z").getTime(),
      weekStartDateKey: "2024-01-15",
      weekEndDateKey: "2024-01-21",
      total: 1,
      completed: 1,
    };
    (globalThis as { __trelloSummaryTooltipPayload?: unknown }).__trelloSummaryTooltipPayload = [
      { dataKey: "total", value: 1, payload: point },
      { dataKey: "completed", value: 0, payload: point },
    ];
    render(
      <SummaryCumulativeChart
        chartData={[point]}
        dateRangeSubtitle={null}
        xAxisDomain={wideDomain}
        deadlineStart="2024-01-10"
        projectStartTime={projectStartTime}
        projectEndTime={null}
      />,
    );
    expect(screen.getByTestId("tooltip-filled")).toHaveTextContent(/Week \d+/);
  });

  it("renders start and end project boundary lines when in range and end differs from start", () => {
    const projectStartTime = new Date("2024-01-10T12:00:00Z").getTime();
    const projectEndTime = new Date("2024-01-25T12:00:00Z").getTime();
    const chartData: SummaryChartPoint[] = [
      {
        week: "A",
        weekKey: "2024-01-01",
        time: new Date("2024-01-04T12:00:00Z").getTime(),
        weekStartDateKey: "2024-01-01",
        weekEndDateKey: "2024-01-07",
        total: 1,
        completed: 0,
      },
    ];
    render(
      <SummaryCumulativeChart
        chartData={chartData}
        dateRangeSubtitle={null}
        xAxisDomain={wideDomain}
        deadlineStart="2024-01-10"
        deadlineEnd="2024-01-25"
        projectStartTime={projectStartTime}
        projectEndTime={projectEndTime}
      />,
    );
    const lines = screen.getAllByTestId("reference-line");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveAttribute("data-x", String(projectStartTime));
    expect(lines[1]).toHaveAttribute("data-x", String(projectEndTime));
  });

  it("uses Math.ceil relative week label when chart week starts before project week", () => {
    const projectStartTime = new Date("2024-01-15T12:00:00Z").getTime();
    const earlyPoint: SummaryChartPoint = {
      week: "ignored",
      weekKey: "2024-01-01",
      time: new Date("2024-01-04T12:00:00Z").getTime(),
      weekStartDateKey: "2024-01-01",
      weekEndDateKey: "2024-01-07",
      total: 1,
      completed: 0,
    };
    (globalThis as { __trelloSummaryTooltipPayload?: unknown }).__trelloSummaryTooltipPayload = [
      { dataKey: "total", value: 1, payload: earlyPoint },
    ];
    render(
      <SummaryCumulativeChart
        chartData={[earlyPoint]}
        dateRangeSubtitle={null}
        xAxisDomain={wideDomain}
        deadlineStart="2024-01-15"
        projectStartTime={projectStartTime}
        projectEndTime={null}
      />,
    );
    expect(screen.getByTestId("tooltip-filled")).toHaveTextContent(/Week -/);
  });

  it("tooltip totals default to zero when payload entries omit expected dataKeys", () => {
    const point: SummaryChartPoint = {
      week: "W",
      weekKey: "2024-01-08",
      time: new Date("2024-01-10T12:00:00Z").getTime(),
      weekStartDateKey: "2024-01-08",
      weekEndDateKey: "2024-01-14",
      total: 9,
      completed: 3,
    };
    (globalThis as { __trelloSummaryTooltipPayload?: unknown }).__trelloSummaryTooltipPayload = [
      { dataKey: "other", value: 5, payload: point },
    ];
    render(
      <SummaryCumulativeChart
        chartData={[point]}
        dateRangeSubtitle={null}
        xAxisDomain={wideDomain}
        projectStartTime={null}
        projectEndTime={null}
      />,
    );
    expect(screen.getByTestId("tooltip-filled")).toHaveTextContent("Total: 0");
    expect(screen.getByTestId("tooltip-filled")).toHaveTextContent("Completed: 0");
  });
});
