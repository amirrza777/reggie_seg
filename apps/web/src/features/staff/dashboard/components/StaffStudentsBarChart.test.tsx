import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffStudentsBarChart } from "./StaffStudentsBarChart";

let lastBarChartProps: Record<string, unknown> | null = null;
let lastTooltipProps: Record<string, unknown> | null = null;
let lastBarProps: Record<string, unknown> | null = null;

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, ...props }: { children?: ReactNode }) => {
    lastBarChartProps = props;
    return <div data-testid="bar-chart">{children}</div>;
  },
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
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
  });

  it("renders an empty-state message when there are no projects", () => {
    render(<StaffStudentsBarChart projects={[]} />);
    expect(screen.getByText("No project data available.")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
  });

  it("renders chart data with truncated labels and tooltip formatter behavior", () => {
    const projects = [
      { name: "A very very long project name", students: 12 },
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
    expect(chartData[0].name).toBe("A very very long project name");
    expect(chartData[0].label.endsWith("…")).toBe(true);
    expect(chartData[0].label).toHaveLength(19);

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
});
