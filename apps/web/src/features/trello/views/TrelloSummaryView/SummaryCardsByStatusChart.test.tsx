import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryCardsByStatusChart } from "./SummaryCardsByStatusChart";
import type { CardCountByStatus } from "@/features/trello/lib/velocity";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => null,
  Tooltip: ({ formatter }: { formatter?: (value: number, name: string) => [unknown, unknown] }) => (
    <div data-testid="summary-tooltip">{formatter ? String(formatter(7, "Backlog")[0]) : ""}</div>
  ),
}));

describe("SummaryCardsByStatusChart", () => {
  it("shows empty state when there are no cards", () => {
    const counts: CardCountByStatus = {
      total: 0,
      backlog: 0,
      inProgress: 0,
      completed: 0,
      informationOnly: 0,
    };
    render(<SummaryCardsByStatusChart counts={counts} />);
    expect(screen.getByText("No cards yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();
  });

  it("shows empty state when total > 0 but all segments would be zero (should not happen with valid data)", () => {
    const counts: CardCountByStatus = {
      total: 3,
      backlog: 0,
      inProgress: 0,
      completed: 0,
      informationOnly: 0,
    };
    render(<SummaryCardsByStatusChart counts={counts} />);
    expect(screen.getByText("No cards yet.")).toBeInTheDocument();
  });

  it("renders pie chart when there is positive segment data", () => {
    const counts: CardCountByStatus = {
      total: 5,
      backlog: 2,
      inProgress: 1,
      completed: 1,
      informationOnly: 1,
    };
    render(<SummaryCardsByStatusChart counts={counts} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("summary-tooltip")).toHaveTextContent("7");
    expect(screen.queryByText("No cards yet.")).not.toBeInTheDocument();
  });
});
