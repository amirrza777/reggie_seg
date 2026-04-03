import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffActivityDonutChart } from "./StaffActivityDonutChart";

let lastPieProps: Record<string, unknown> | null = null;
let lastTooltipProps: Record<string, unknown> | null = null;

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children, ...props }: { children?: ReactNode }) => {
    lastPieProps = props;
    return <div data-testid="pie">{children}</div>;
  },
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell">{fill}</div>,
  Label: ({ value }: { value: string }) => <div data-testid="pie-label">{value}</div>,
  Tooltip: (props: Record<string, unknown>) => {
    lastTooltipProps = props;
    return <div data-testid="tooltip" />;
  },
  Legend: ({ formatter }: { formatter?: (value: string) => ReactNode }) => (
    <div data-testid="legend">{formatter?.("Active")}</div>
  ),
}));

describe("StaffActivityDonutChart", () => {
  beforeEach(() => {
    lastPieProps = null;
    lastTooltipProps = null;
  });

  it("renders an empty-state message when all values are zero", () => {
    render(<StaffActivityDonutChart active={0} lowActivity={0} inactive={0} />);
    expect(screen.getByText("No team data available.")).toBeInTheDocument();
    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();
  });

  it("renders chart primitives, percentages, and click handling for populated data", () => {
    render(<StaffActivityDonutChart active={5} lowActivity={3} inactive={2} />);

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pie-label")).toHaveTextContent("10");
    expect(screen.getAllByTestId("cell")).toHaveLength(3);
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("legend")).toHaveTextContent("Active");

    expect(lastPieProps?.paddingAngle).toBe(2);
    const stopPropagation = vi.fn();
    (lastPieProps?.onClick as ((sector: unknown, index: number, event: { stopPropagation: () => void }) => void))?.(
      {},
      0,
      { stopPropagation },
    );
    expect(stopPropagation).toHaveBeenCalledTimes(1);

    const formatter = lastTooltipProps?.formatter as ((value: unknown, name: string) => [string, string]) | undefined;
    expect(formatter?.(2, "Active")).toEqual(["2 (20%)", "Active"]);
  });

  it("uses zero padding for a single-segment donut", () => {
    render(<StaffActivityDonutChart active={4} lowActivity={0} inactive={0} />);
    expect(lastPieProps?.paddingAngle).toBe(0);
  });

  it("formats percentage fallback when total is zero but a segment exists", () => {
    render(<StaffActivityDonutChart active={1} lowActivity={-1} inactive={0} />);

    expect(screen.getByTestId("pie-label")).toHaveTextContent("0");
    const formatter = lastTooltipProps?.formatter as ((value: unknown, name: string) => [string, string]) | undefined;
    expect(formatter?.(1, "Active")).toEqual(["1 (0%)", "Active"]);
  });
});
