import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffStudentsBarChart } from "./StaffStudentsBarChart";

let lastBarChartProps: Record<string, unknown> | null = null;
let lastTooltipProps: Record<string, unknown> | null = null;
let lastBarProps: Record<string, unknown> | null = null;
let lastYAxisProps: Record<string, unknown> | null = null;

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, ...props }: { children?: ReactNode }) => {
    lastBarChartProps = props;
    return <div data-testid="bar-chart">{children}</div>;
  },
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: (props: Record<string, unknown>) => {
    lastYAxisProps = props;
    return <div data-testid="y-axis" />;
  },
  Tooltip: (props: Record<string, unknown>) => {
    lastTooltipProps = props;
    return <div data-testid="tooltip" />;
  },
  Bar: (props: Record<string, unknown>) => {
    lastBarProps = props;
    return <div data-testid="bar" />;
  },
}));

describe("StaffStudentsBarChart", () => {
  beforeEach(() => {
    lastBarChartProps = null;
    lastTooltipProps = null;
    lastBarProps = null;
    lastYAxisProps = null;
  });

  it("renders an empty-state message when there are no projects", () => {
    render(<StaffStudentsBarChart projects={[]} />);
    expect(screen.getByText("No project data available.")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
  });

  it("renders chart data with wider labels and tooltip formatter behavior", () => {
    const projects = [
      { name: "A long project name that should still fit", students: 12 },
      { name: "Project Two", students: 8 },
      { name: "Project Three", students: 7 },
      { name: "Project Four", students: 5 },
      { name: "Project Five", students: 3 },
    ];

    const { container } = render(<StaffStudentsBarChart projects={projects} />);

    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("bar")).toBeInTheDocument();

    const chartContainer = container.querySelector(".ui-no-select") as HTMLDivElement;
    expect(chartContainer.style.height).toBe("230px");

    const chartData = (lastBarChartProps?.data ?? []) as Array<{ name: string; label: string; students: number }>;
    expect(chartData).toHaveLength(5);
    expect(chartData[0].name).toBe("A long project name that should still fit");
    expect(chartData[0].label.endsWith("…")).toBe(false);
    expect(lastYAxisProps?.width).toBeGreaterThan(180);
    expect(lastYAxisProps?.width).toBeLessThan(280);

    const formatter = lastTooltipProps?.formatter as
      | ((value: number, name: string, entry: { payload?: { name?: string } }) => [number, string])
      | undefined;
    expect(formatter?.(12, "Students", { payload: { name: "Project Full Name" } })).toEqual([12, "Project Full Name"]);
    expect(formatter?.(4, "Students", {})).toEqual([4, "Students"]);
    const labelFormatter = lastTooltipProps?.labelFormatter as (() => string) | undefined;
    expect(labelFormatter?.()).toBe("");

    expect(lastBarProps?.dataKey).toBe("students");
    expect(lastBarProps?.fill).toBe("#6366f1");
  });

  it("truncates very long labels and falls back when canvas measurement fails", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0");
    const createElementOriginal = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === "canvas") {
        throw new Error("canvas unavailable");
      }
      return createElementOriginal(tagName as any, options as any);
    });

    render(
      <StaffStudentsBarChart
        projects={[
          {
            name: "This project title is intentionally long enough to trigger the truncation branch in chart labels",
            students: 4,
          },
        ]}
      />,
    );

    const chartData = (lastBarChartProps?.data ?? []) as Array<{ label: string }>;
    expect(chartData[0]?.label.endsWith("…")).toBe(true);
    expect(lastYAxisProps?.width).toBeGreaterThanOrEqual(140);
  });
});
