import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubDonutChartCard } from "./GithubDonutChartCard";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label?: (payload: { percent?: number }) => string;
  }) => <div data-testid="pie">{label ? `${label({ percent: 0.25 })} ${label({})}` : ""}{children}</div>,
  Label: ({ value }: { value: string }) => <div data-testid="label">{value}</div>,
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell">{fill}</div>,
  Tooltip: ({ formatter }: { formatter?: (value: unknown, name: string) => [string, string] }) => (
    <div data-testid="tooltip">
      {formatter ? `${formatter(3, "Commits")[0]} ${formatter(undefined, "Commits")[0]}` : ""}
    </div>
  ),
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
    expect(screen.getByTestId("pie")).toHaveTextContent("25.0%");
    expect(screen.getByTestId("label")).toHaveTextContent("10");
    expect(screen.getAllByTestId("cell")).toHaveLength(2);
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("legend")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toHaveTextContent("3 (30.0%)");
  });

  it("renders info-title mode when info metadata is provided", () => {
    render(
      <GithubDonutChartCard
        title="Coverage"
        info={{ title: "Help", description: "Details", bullets: ["A"] }}
        data={[{ name: "Matched", value: 1, fill: "#22c55e" }]}
      />,
    );

    expect(screen.getByText("Coverage")).toBeInTheDocument();
  });

  it("formats tooltip percentages as 0.0% when total is zero", () => {
    render(
      <GithubDonutChartCard
        title="Zero totals"
        data={[
          { name: "Matched", value: 0, fill: "#22c55e" },
          { name: "Unmatched", value: 0, fill: "#f59e0b" },
        ]}
      />,
    );

    expect(screen.getByTestId("tooltip")).toHaveTextContent("3 (0.0%)");
  });
});
