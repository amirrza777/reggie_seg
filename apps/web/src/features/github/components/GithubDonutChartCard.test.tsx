import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubDonutChartCard } from "./GithubDonutChartCard";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell">{fill}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe("GithubDonutChartCard", () => {
  it("returns null when there is no data", () => {
    const { container } = render(<GithubDonutChartCard title="Coverage" data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title and donut chart primitives for provided data", () => {
    render(
      <GithubDonutChartCard
        title="Coverage"
        data={[
          { name: "Matched", value: 8, fill: "#22c55e" },
          { name: "Unmatched", value: 2, fill: "#f59e0b" },
        ]}
      />
    );

    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByTestId("responsive")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pie")).toBeInTheDocument();
    expect(screen.getAllByTestId("cell")).toHaveLength(2);
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("legend")).toBeInTheDocument();
  });
});

